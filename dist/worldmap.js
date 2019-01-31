'use strict';

System.register(['lodash', './libs/leaflet', './libs/leaflet-ant-path', './colors'], function (_export, _context) {
  "use strict";

  var _, L, antPath, Colors, _createClass, tileServers, WorldMap;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
    }, function (_libsLeaflet) {
      L = _libsLeaflet.default;
    }, function (_libsLeafletAntPath) {
      antPath = _libsLeafletAntPath.antPath;
    }, function (_colors) {
      Colors = _colors.default;
    }],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      tileServers = {
        'CartoDB Positron': {
          url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
          attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
          subdomains: 'abcd'
        },
        'CartoDB Dark': {
          url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
          attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
          subdomains: 'abcd'
        },
        'Open Street Maps': {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          subdomains: 'abc'
        },
        'Stamen Maps': {
          url: 'http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png',
          attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.',
          subdomains: 'abc'

        }
      };

      WorldMap = function () {
        function WorldMap(ctrl, mapContainer) {
          var _this = this;

          _classCallCheck(this, WorldMap);

          this.onMove = function (moveEvent) {
            if (!moveEvent.target) {
              return;
            }
            _this.setBoundsOnFirstLoad = false;
            _this.ctrl.onBoundsChange(_this.flattenBounds(moveEvent.target.getBounds(), 'move'));
          }.bind(this);

          this.onZoom = function (zoomEvent) {
            if (!zoomEvent.target) {
              return;
            }
            _this.setBoundsOnFirstLoad = false;
            _this.ctrl.onBoundsChange(_this.flattenBounds(zoomEvent.target.getBounds(), 'zoom'));
          }.bind(this);

          this.onResize = function (resizeEvent) {
            if (!resizeEvent.target) {
              return;
            }
            _this.ctrl.onBoundsChange(_this.flattenBounds(resizeEvent.target.getBounds(), 'resize'));
          }.bind(this);

          this.ctrl = ctrl;
          this.mapContainer = mapContainer;
          this.circles = [];
          this.lineCoords = [];
          this.extraLineLayers = [];
          this.markerLayers = [];
          this.geoJsonLayers = [];
          this.geoJsonBounds = null;
          this.linesLayer = null;
          this.lineColor = _.first(this.ctrl.panel.colors);
          this.drawTrail = this.ctrl.panel.showTrail;
          this.antPathDelay = this.ctrl.panel.antPathDelay;
          this.useCustomAntPathColor = this.ctrl.panel.customAntPathColor;
          this.antPathColor = this.ctrl.panel.antPathColor;
          this.antPathPulseColor = this.ctrl.panel.antPathPulseColor;
          this.extraLineColors = this.ctrl.panel.extraLineColors;
          this.extraLineSecondaryColors = this.ctrl.panel.extraLineSecondaryColors;
          this.lastBounds = null;
          this.showAsAntPath = true;
          this.setBoundsOnFirstLoad = true;
          return this.createMap();
        }

        _createClass(WorldMap, [{
          key: 'createMap',
          value: function createMap() {
            window.L.Icon.Default.imagePath = 'public/plugins/grafana-custom-worldmap-panel/images/';
            var mapCenter = window.L.latLng(parseFloat(this.ctrl.panel.mapCenterLatitude), parseFloat(this.ctrl.panel.mapCenterLongitude));
            this.map = window.L.map(this.mapContainer, { worldCopyJump: true, center: mapCenter, zoom: parseInt(this.ctrl.panel.initialZoom, 10) || 1 });
            this.setMouseWheelZoom();

            var selectedTileServer = tileServers[this.ctrl.tileServer];
            window.L.tileLayer(selectedTileServer.url, {
              maxZoom: 18,
              subdomains: selectedTileServer.subdomains,
              reuseTiles: true,
              detectRetina: true,
              attribution: selectedTileServer.attribution
            }).addTo(this.map);

            this.map.on('zoomend', this.onZoom);
            this.map.on('moveend', this.onZoom);
            this.map.on('resize', this.onResize);
          }
        }, {
          key: 'createLegend',
          value: function createLegend() {
            var _this2 = this;

            this.legend = window.L.control({ position: 'bottomleft' });
            this.legend.onAdd = function () {
              _this2.legend._div = window.L.DomUtil.create('div', 'info legend');
              _this2.legend.update();
              return _this2.legend._div;
            };

            this.legend.update = function () {
              if (!_this2.ctrl.data || _this2.ctrl.data.length === 0) {
                return;
              }
              var thresholds = _this2.ctrl.data[0].thresholds;
              var legendHtml = '';
              legendHtml += '<div class="legend-item"><i style="background:' + _this2.ctrl.panel.colors[0] + '"></i> ' + '&lt; ' + thresholds[0] + '</div>';
              for (var index = 0; index < thresholds.length; index += 1) {
                legendHtml += '<div class="legend-item"><i style="background:' + _this2.ctrl.panel.colors[index + 1] + '"></i> ' + thresholds[index] + (thresholds[index + 1] ? '&ndash;' + thresholds[index + 1] + '</div>' : '+');
              }
              _this2.legend._div.innerHTML = legendHtml;
            };
            this.legend.addTo(this.map);
          }
        }, {
          key: 'needToRedrawCircles',
          value: function needToRedrawCircles(data) {
            if (this.circles.length === 0 && data.length > 0) return true;

            if (this.circles.length !== data.length) return true;
            var locations = _.map(_.map(this.circles, 'options'), 'location').sort();
            var dataPoints = _.map(data, 'key').sort();
            return !_.isEqual(locations, dataPoints);
          }
        }, {
          key: 'filterEmptyAndZeroValues',
          value: function filterEmptyAndZeroValues(data) {
            var _this3 = this;

            return _.filter(data, function (o) {
              return !(_this3.ctrl.panel.hideEmpty && _.isNil(o.value)) && !(_this3.ctrl.panel.hideZero && o.value === 0);
            });
          }
        }, {
          key: 'clearCircles',
          value: function clearCircles() {
            if (this.circlesLayer) {
              this.circlesLayer.clearLayers();
              this.removeCircles(this.circlesLayer);
              this.circles = [];
            }
          }
        }, {
          key: 'onEachGeoJsonFeature',
          value: function onEachGeoJsonFeature(feature, layer) {
            // console.log('Feature %o', feature);
            if (!this.ctrl.panel) {
              return;
            }

            if (feature.properties[this.ctrl.panel.geoJsonOptions.popupContentField]) {
              layer.bindPopup(feature.properties[this.ctrl.panel.geoJsonOptions.popupContentField]);
            }
          }
        }, {
          key: 'drawGeoJson',
          value: function drawGeoJson() {
            var _this4 = this;

            var self = this;
            var data = this.ctrl.data;
            if (!data || !data.length) {
              return;
            }
            data.forEach(function (dataObj) {
              if (!dataObj || !dataObj.geoJson) {
                return;
              }
              var geoJsonObj = JSON.parse(dataObj.geoJson);
              var geoJsonLayer = window.L.geoJSON(geoJsonObj, {
                onEachFeature: self.onEachGeoJsonFeature.bind(self)
              }).addTo(_this4.map);

              if (!_this4.geoJsonBounds) {
                _this4.geoJsonBounds = geoJsonLayer.getBounds();
              } else {
                _this4.geoJsonBounds.extend(geoJsonLayer.getBounds());
              }
              if (_this4.geoJsonBounds && _this4.setBoundsOnFirstLoad) {
                _this4.map.fitBounds(_this4.geoJsonBounds);
              }

              _this4.geoJsonLayers.push(geoJsonLayer);
            });
          }
        }, {
          key: 'drawCircles',
          value: function drawCircles() {
            var data = this.filterEmptyAndZeroValues(this.ctrl.data[0]);

            if (this.needToRedrawCircles(data)) {
              this.clearCircles();
              this.createCircles(data);
              this.clearPolyLine();
              if (this.drawTrail) {
                var extraLineLayers = this.drawExtraLines();
              }
            } else {
              this.updateCircles(data);
            }
          }
        }, {
          key: 'focus',
          value: function focus() {
            if (this.map) {
              this.map.getContainer().focus();
            }
          }
        }, {
          key: 'createCircles',
          value: function createCircles(data) {
            var _this5 = this;

            var circles = [];
            data.forEach(function (dataPoint) {
              if (!dataPoint.locationName) return;
              var c = _this5.createCircle(dataPoint);
              _this5.lineColor = _this5.getColor(dataPoint.value);
              if (_this5.drawTrail) {
                _this5.lineCoords.push([c.getLatLng().lat, c.getLatLng().lng]);
              }
              circles.push(c);
            });
            this.circlesLayer = this.addCircles(circles);
            this.circles = circles;
          }
        }, {
          key: 'clearPolyLine',
          value: function clearPolyLine() {
            var _this6 = this;

            if (this.linesLayer) {
              this.removeLines(this.linesLayer);
            }
            if (this.extraLineLayers) {
              this.extraLineLayers.forEach(function (layer) {
                _this6.removeLines(layer);
              });
            }
            if (this.markerLayers) {
              this.markerLayers.forEach(function (layer) {
                if (layer.getPopup()) {
                  layer.unbindPopup();
                }
                _this6.removeLines(layer);
              });
            }
          }
        }, {
          key: 'toCoords',
          value: function toCoords(dataset) {
            var resultArr = [];

            dataset.forEach(function (dataPoint) {
              resultArr.push([dataPoint.locationLatitude, dataPoint.locationLongitude]);
            });

            return resultArr;
          }
        }, {
          key: 'drawMarkers',
          value: function drawMarkers(dataset) {
            var _this7 = this;

            var self = this;
            dataset.forEach(function (dataPoint) {
              if (dataPoint.marker) {
                var marker = window.L.marker([dataPoint.locationLatitude, dataPoint.locationLongitude], {
                  title: dataPoint.marker,
                  draggable: false
                }).addTo(_this7.map);
                var popup = window.L.popup().setContent('<b style="color: #666666">' + dataPoint.marker + '</b>');
                marker.bindPopup(popup);
                marker.on('click', function (evt) {
                  if (marker.isPopupOpen() === false) {
                    marker.openPopup();
                  }
                });
                marker.on('mouseover', function (evt) {
                  if (marker.isPopupOpen() === false) {
                    marker.openPopup();
                  }
                });

                self.markerLayers.push(marker);
              }
            });
            return this.markerLayers;
          }
        }, {
          key: 'drawExtraLines',
          value: function drawExtraLines() {
            var self = this;
            if (!this.ctrl.data || this.ctrl.data.length < 1) {
              return;
            }

            for (var dataIdx = 1; dataIdx < this.ctrl.data.length; dataIdx += 1) {
              var lineColor = this.extraLineColors && this.extraLineColors.length >= dataIdx ? this.extraLineColors[dataIdx - 1] : Colors.random();
              var secondaryLineColor = this.extraLineSecondaryColors && this.extraLineSecondaryColors.length >= dataIdx ? this.extraLineSecondaryColors[dataIdx - 1] : Colors.random();
              var layer = null;

              if (this.showAsAntPath) {
                layer = window.L.polyline.antPath(self.toCoords(this.ctrl.data[dataIdx]), {
                  'delay': this.antPathDelay,
                  'dashArray': [10, 20],
                  'weight': 5,
                  'color': lineColor,
                  'pulseColor': this.useCustomAntPathColor ? secondaryLineColor : '#FFFFFF',
                  'paused': false,
                  'reverse': false
                }).addTo(this.map);
              } else {
                layer = window.L.polyline(self.toCoords(this.ctrl.data[dataIdx]), {
                  color: lineColor
                }).addTo(this.map);
              }
              this.extraLineLayers.push(layer);
              self.drawMarkers(this.ctrl.data[dataIdx]);
            }
            return this.extraLineLayers;
          }
        }, {
          key: 'drawPolyLine',
          value: function drawPolyLine() {
            if (this.showAsAntPath) {
              this.linesLayer = window.L.polyline.antPath(this.lineCoords, {
                'delay': this.antPathDelay,
                'dashArray': [10, 20],
                'weight': 5,
                'color': this.useCustomAntPathColor ? this.antPathColor : this.lineColor,
                'pulseColor': this.useCustomAntPathColor ? this.antPathPulseColor : '#FFFFFF',
                'paused': false,
                'reverse': false
              }).addTo(this.map);
            } else {
              this.linesLayer = window.L.polyline(this.lineCoords, {
                color: this.lineColor
              }).addTo(this.map);
            }
            return this.linesLayer;
          }
        }, {
          key: 'updateCircles',
          value: function updateCircles(data) {
            var _this8 = this;

            data.forEach(function (dataPoint) {
              if (!dataPoint.locationName) return;

              var circle = _.find(_this8.circles, function (cir) {
                return cir.options.location === dataPoint.key;
              });

              if (circle) {
                circle.setRadius(_this8.calcCircleSize(dataPoint.value || 0));
                circle.setStyle({
                  color: _this8.getColor(dataPoint.value),
                  fillColor: _this8.getColor(dataPoint.value),
                  fillOpacity: 0.5,
                  location: dataPoint.key
                });
                circle.unbindPopup();
                _this8.createPopup(circle, dataPoint.locationName, dataPoint.valueRounded);
              }
            });
          }
        }, {
          key: 'createCircle',
          value: function createCircle(dataPoint) {
            var circle = window.L.circleMarker([dataPoint.locationLatitude, dataPoint.locationLongitude], {
              radius: this.calcCircleSize(dataPoint.value || 0),
              color: this.getColor(dataPoint.value),
              fillColor: this.getColor(dataPoint.value),
              fillOpacity: 0.5,
              location: dataPoint.key
            });
            if (dataPoint.url) {
              if (this.ctrl.panel.urlFollowOptions.openInNewWindow) {
                var name = '_blank';
                var specs = '';
                if (this.ctrl.panel.urlFollowOptions.useHeadlessWindow) {
                  specs = 'menubar=0,resizable=1,location=0,titlebar=0,toolbar=0';
                }
                circle.on('click', function () {
                  window.open(dataPoint.url, name, specs);
                });
              } else {
                circle.on('click', function () {
                  window.location.replace(dataPoint.url);
                });
              }
            }

            var value = dataPoint.valueRounded;
            var label = '';
            if (dataPoint.label) {
              label = dataPoint.label;
            } else {
              var unit = value && value === 1 ? this.ctrl.panel.unitSingular : this.ctrl.panel.unitPlural;
              label = (dataPoint.locationName + ': ' + value + ' ' + (unit || '')).trim();
            }
            this.createPopup(circle, label);
            return circle;
          }
        }, {
          key: 'calcCircleSize',
          value: function calcCircleSize(dataPointValue) {
            var circleMinSize = parseInt(this.ctrl.panel.circleMinSize, 10) || 2;
            var circleMaxSize = parseInt(this.ctrl.panel.circleMaxSize, 10) || 30;

            if (this.ctrl.data[0].valueRange === 0) {
              return circleMaxSize;
            }

            var dataFactor = (dataPointValue - this.ctrl.data[0].lowestValue) / this.ctrl.data[0].valueRange;
            var circleSizeRange = circleMaxSize - circleMinSize;

            return circleSizeRange * dataFactor + circleMinSize;
          }
        }, {
          key: 'createPopup',
          value: function createPopup(circle, label) {
            circle.bindPopup(label, { 'offset': window.L.point(0, -2), 'className': 'worldmap-popup', 'closeButton': this.ctrl.panel.stickyLabels });

            circle.on('mouseover', function onMouseOver(evt) {
              var layer = evt.target;
              layer.bringToFront();
              this.openPopup();
            });

            if (!this.ctrl.panel.stickyLabels) {
              circle.on('mouseout', function onMouseOut() {
                circle.closePopup();
              });
            }
          }
        }, {
          key: 'getColor',
          value: function getColor(value) {
            for (var index = this.ctrl.data[0].thresholds.length; index > 0; index -= 1) {
              if (value >= this.ctrl.data[0].thresholds[index - 1]) {
                return this.ctrl.panel.colors[index];
              }
            }
            return _.first(this.ctrl.panel.colors);
          }
        }, {
          key: 'resize',
          value: function resize() {
            this.map.invalidateSize();
          }
        }, {
          key: 'panToMapCenter',
          value: function panToMapCenter() {
            this.map.panTo([parseFloat(this.ctrl.panel.mapCenterLatitude), parseFloat(this.ctrl.panel.mapCenterLongitude)]);
            this.ctrl.mapCenterMoved = false;
          }
        }, {
          key: 'removeLegend',
          value: function removeLegend() {
            this.legend.remove(this.map);
            this.legend = null;
          }
        }, {
          key: 'setMouseWheelZoom',
          value: function setMouseWheelZoom() {
            if (!this.ctrl.panel.mouseWheelZoom) {
              this.map.scrollWheelZoom.disable();
            } else {
              this.map.scrollWheelZoom.enable();
            }
          }
        }, {
          key: 'addCircles',
          value: function addCircles(circles) {
            return window.L.layerGroup(circles).addTo(this.map);
          }
        }, {
          key: 'removeCircles',
          value: function removeCircles() {
            this.map.removeLayer(this.circlesLayer);
          }
        }, {
          key: 'removeLines',
          value: function removeLines(layer) {
            this.map.removeLayer(layer);
          }
        }, {
          key: 'showTrail',
          value: function showTrail(flag) {
            this.drawTrail = flag;
            if (!this.drawTrail) {
              this.clearPolyLine();
            }
          }
        }, {
          key: 'setAntPathOptions',
          value: function setAntPathOptions(delay, useCustomColor, color, pulseColor) {
            this.useCustomAntPathColor = useCustomColor;
            this.antPathDelay = delay;
            this.antPathColor = color;
            this.antPathPulseColor = pulseColor;
          }
        }, {
          key: 'setPathColors',
          value: function setPathColors(color1, color2) {
            this.pathColor1 = color1;
            this.pathColor2 = color2;
          }
        }, {
          key: 'setExtraLineColors',
          value: function setExtraLineColors(colors) {
            this.extraLineColors = colors;
          }
        }, {
          key: 'setExtraLineSecondaryColors',
          value: function setExtraLineSecondaryColors(colors) {
            this.extraLineSecondaryColors = colors;
          }
        }, {
          key: 'setShowAsAntPath',
          value: function setShowAsAntPath(flag) {
            this.showAsAntPath = flag;
          }
        }, {
          key: 'setZoom',
          value: function setZoom(zoomFactor) {
            this.map.setZoom(parseInt(zoomFactor, 10));
          }
        }, {
          key: 'remove',
          value: function remove() {
            this.circles = [];
            if (this.circlesLayer) this.removeCircles();
            if (this.legend) this.removeLegend();
            this.map.remove();
          }
        }, {
          key: 'flattenBounds',
          value: function flattenBounds(bounds, trigger) {
            if (!bounds) {
              return {};
            }
            var maxChangeDelta = this.calculateMaxChangeDelta(bounds);

            return {
              nortWest: { lat: bounds.getNorthWest().lat, lng: bounds.getNorthWest().lng },
              northEast: { lat: bounds.getNorthEast().lat, lng: bounds.getNorthEast().lng },
              southEast: { lat: bounds.getSouthEast().lat, lng: bounds.getSouthEast().lng },
              southWest: { lat: bounds.getSouthWest().lat, lng: bounds.getSouthWest().lng },
              triggeredBy: trigger,
              maxChangeDelta: maxChangeDelta
            };
          }
        }, {
          key: 'calculateMaxChangeDelta',
          value: function calculateMaxChangeDelta(bounds) {
            var maxChangeDelta = 0;
            if (this.lastBounds) {
              var nwDist = window.L.CRS.Simple.distance(bounds.getNorthWest(), this.lastBounds.getNorthWest());
              if (nwDist > maxChangeDelta) {
                maxChangeDelta = nwDist;
              }
              var neDist = window.L.CRS.Simple.distance(bounds.getNorthEast(), this.lastBounds.getNorthEast());
              if (neDist > maxChangeDelta) {
                maxChangeDelta = neDist;
              }
              var seDist = window.L.CRS.Simple.distance(bounds.getSouthEast(), this.lastBounds.getSouthEast());
              if (seDist > maxChangeDelta) {
                maxChangeDelta = seDist;
              }
              var swDist = window.L.CRS.Simple.distance(bounds.getSouthWest(), this.lastBounds.getSouthWest());
              if (swDist > maxChangeDelta) {
                maxChangeDelta = swDist;
              }
              return maxChangeDelta;
            }
            this.lastBounds = bounds;
          }
        }]);

        return WorldMap;
      }();

      _export('default', WorldMap);
    }
  };
});
//# sourceMappingURL=worldmap.js.map

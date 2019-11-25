import _ from 'lodash';
/* eslint-disable id-length, no-unused-vars */
import L from './libs/leaflet';
import {} from './libs/leaflet-markercluster/index';

/* eslint-disable id-length, no-unused-vars */
import {
  antPath
} from './libs/leaflet-ant-path';
import './libs/leaflet-label';
/* eslint class-methods-use-this: ["error", { "exceptMethods": ["toCoords","flattenBounds","onEachGeoJsonFeature"] }] */
/* eslint-disable no-extra-bind */
import Colors from './colors';


const tileServers = {
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

  },
  'Esri Standard': {
    url: 'https://server.arcgisonline.com/arcgis/rest/services/World_Street_Map/MapServer/tile/{z}/{x}/{y}',
    attribution: 'Powered by <a href="https://www.esri.com/">Esri</a>| Esri, DeLorme, HERE, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), MapmyIndia, Tomtom',
    subdomains: ''

  },
  'Esri Transportation': {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{x}/{y}',
    attribution: 'Powered by <a href="https://www.esri.com/">Esri</a>| Esri, DeLorme, HERE, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), MapmyIndia, Tomtom',
    subdomains: ''

  },
  'Esri Terrain': {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{x}/{y}',
    attribution: 'Powered by <a href="https://www.esri.com/">Esri</a>| Esri, DeLorme, HERE, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), MapmyIndia, Tomtom',
    subdomains: ''

  }
};

export default class WorldMap {
  constructor(ctrl, mapContainer) {
    this.ctrl = ctrl;
    this.mapContainer = mapContainer;
    this.circles = [];
    this.lineCoords = [];
    this.extraLineLayers = [];
    this.markerLayers = [];
    this.geoJsonLayers = [];
    this.geoJsonBounds = null;
    this.linesLayer = null;
    this.pinsLayer = null;
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
    this.isMapReady = false;
    return this.createMap();
  }

  createMap() {
    window.L.Icon.Default.imagePath = 'public/plugins/grafana-custom-worldmap-panel/images/';
    const mapCenter = window.L.latLng(parseFloat(this.ctrl.panel.mapCenterLatitude), parseFloat(this.ctrl.panel.mapCenterLongitude));
    this.map = window.L.map(this.mapContainer, {
      worldCopyJump: true,
      center: mapCenter,
      zoom: parseInt(this.ctrl.panel.initialZoom, 10) || 1
    });
    this.setMouseWheelZoom();

    const selectedTileServer = tileServers[this.ctrl.tileServer];
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

    this.map.whenReady(() => {
      this.isMapReady = true;
    });
  }

  createLegend() {
    this.legend = window.L.control({
      position: 'bottomleft'
    });
    this.legend.onAdd = () => {
      this.legend._div = window.L.DomUtil.create('div', 'info legend');
      this.legend.update();
      return this.legend._div;
    };

    this.legend.update = () => {
      if (!this.ctrl.data || this.ctrl.data.length === 0 || !this.ctrl.data[0].thresholds) {
        return;
      }
      const thresholds = this.ctrl.data[0].thresholds;
      let legendHtml = '';
      legendHtml += '<div class="legend-item"><i style="background:' + this.ctrl.panel.colors[0] + '"></i> ' +
        '&lt; ' + thresholds[0] + '</div>';
      for (let index = 0; index < thresholds.length; index += 1) {
        legendHtml +=
          '<div class="legend-item"><i style="background:' + this.ctrl.panel.colors[index + 1] + '"></i> ' +
          thresholds[index] + (thresholds[index + 1] ? '&ndash;' + thresholds[index + 1] + '</div>' : '+');
      }
      this.legend._div.innerHTML = legendHtml;
    };
    this.legend.addTo(this.map);
  }

  needToRedrawCircles(data) {
    if (this.circles.length === 0 && data.length > 0) return true;

    if (this.circles.length !== data.length) return true;
    const locations = _.map(_.map(this.circles, 'options'), 'location').sort();
    const dataPoints = _.map(data, 'key').sort();
    return !_.isEqual(locations, dataPoints);
  }

  filterEmptyAndZeroValues(data) {
    return _.filter(data, (o) => {
      return !(this.ctrl.panel.hideEmpty && _.isNil(o.value)) && !(this.ctrl.panel.hideZero && o.value === 0);
    });
  }

  clearCircles() {
    if (this.circlesLayer) {
      this.circlesLayer.clearLayers();
      this.removeCircles(this.circlesLayer);
      this.circles = [];
    }
  }

  onEachGeoJsonFeature(feature, layer) {
    // console.log('Feature %o', feature);
    if (!this.ctrl.panel) {
      return;
    }

    if (feature.properties[this.ctrl.panel.geoJsonOptions.popupContentField]) {
      layer.bindPopup(feature.properties[this.ctrl.panel.geoJsonOptions.popupContentField]);
    }
    if (feature.properties[this.ctrl.panel.geoJsonOptions.labelField]) {
      layer.bindLabel(feature.properties[this.ctrl.panel.geoJsonOptions.labelField]);
    }
    if (feature.properties[this.ctrl.panel.geoJsonOptions.clickDataField]) {
      layer.on('click', this.ctrl.emitClick(feature.properties[this.ctrl.panel.geoJsonOptions.clickDataField]));
    }
  }

  drawGeoJson() {
    const self = this;
    const data = this.ctrl.data;
    if (!data || !data.length) {
      return;
    }
    data.forEach((dataObj) => {
      if (!dataObj || !dataObj.geoJson) {
        return;
      }
      const geoJsonObj = JSON.parse(dataObj.geoJson);
      const geoJsonLayer = window.L.geoJSON(geoJsonObj, {
        onEachFeature: self.onEachGeoJsonFeature.bind(self)
      }).addTo(this.map);
      if (dataObj.label) {
        const label = new window.L.Label();
        label.setContent(dataObj.label);
        label.setLatLng(geoJsonLayer.getBounds().getCenter());
        this.map.showLabel(label);
      }
      if (!this.geoJsonBounds) {
        this.geoJsonBounds = geoJsonLayer.getBounds();
      } else {
        this.geoJsonBounds.extend(geoJsonLayer.getBounds());
      }
      if (this.geoJsonBounds && this.setBoundsOnFirstLoad) {
        this.map.fitBounds(this.geoJsonBounds);
      }

      this.geoJsonLayers.push(geoJsonLayer);
    });
  }

  drawCircles() {
    const data = this.filterEmptyAndZeroValues(this.ctrl.data[0]);

    if (this.needToRedrawCircles(data)) {
      this.clearCircles();
      this.createCircles(data);
      this.clearPolyLine();
      if (this.drawTrail) {
        const extraLineLayers = this.drawExtraLines();
      }
    } else {
      this.updateCircles(data);
    }
  }

  focus() {
    if (this.map) {
      this.map.getContainer().focus();
    }
  }

  createCircles(data) {
    const circles = [];
    data.forEach((dataPoint) => {
      if (!dataPoint.locationName) return;
      const c = this.createCircle(dataPoint);
      this.lineColor = this.getColor(dataPoint.value);
      if (this.drawTrail) {
        this.lineCoords.push([c.getLatLng().lat, c.getLatLng().lng]);
      }
      circles.push(c);
    });
    this.circlesLayer = this.addCircles(circles);
    this.circles = circles;
  }

  clearPolyLine() {
    if (this.linesLayer) {
      this.removeLines(this.linesLayer);
    }
    if (this.extraLineLayers) {
      this.extraLineLayers.forEach((layer) => {
        this.removeLines(layer);
      });
    }
    if (this.markerLayers) {
      this.markerLayers.forEach((layer) => {
        if (layer.getPopup()) {
          layer.unbindPopup();
        }
        this.removeLines(layer);
      });
    }
  }

  drawPin(lat, long) {
    if (this.pinsLayer) {
      this.pinsLayer.remove();
    }
    this.pinsLayer = window.L.layerGroup([]);

    console.log('drawpin', lat, long);
    const marker = window.L.marker([lat, long], {
      title: '',
      draggable: false,
    });

    this.pinsLayer.addLayer(marker);
    this.pinsLayer.addTo(this.map);
  }

  clearPins() {
    if (this.pinsLayer) {
      this.pinsLayer.remove();
      this.pinsLayer = null;
    }
  }

  toCoords(dataset) {
    const resultArr = [];

    dataset.forEach((dataPoint) => {
      resultArr.push([dataPoint.locationLatitude, dataPoint.locationLongitude]);
    });

    return resultArr;
  }

  drawMarkers(dataset) {
    const self = this;
    const markerGroup = L.markerClusterGroup();
    dataset.forEach((dataPoint) => {
      if (dataPoint.marker) {
        const marker = window.L.marker([dataPoint.locationLatitude, dataPoint.locationLongitude], {
          title: dataPoint.marker,
          draggable: false,
        });

        const popup = window.L.popup().setContent('<b style="color: #666666">' + dataPoint.marker + '</b>');
        marker.bindPopup(popup);
        marker.on('click', (evt) => {
          if (marker.isPopupOpen() === false) {
            marker.openPopup();
          }
        });
        marker.on('mouseover', (evt) => {
          if (marker.isPopupOpen() === false) {
            marker.openPopup();
          }
        });

        markerGroup.addLayer(marker);
      }
    });
    self.markerLayers.push(markerGroup);
    markerGroup.this.addTo(this.map);
    return this.markerLayers;
  }

  drawExtraLines() {
    const self = this;
    if (!this.ctrl.data || this.ctrl.data.length < 1) {
      return;
    }

    for (let dataIdx = 1; dataIdx < this.ctrl.data.length; dataIdx += 1) {
      const lineColor = (this.extraLineColors && this.extraLineColors.length >= dataIdx) ?
        this.extraLineColors[dataIdx - 1] : Colors.random();
      const secondaryLineColor = (this.extraLineSecondaryColors && this.extraLineSecondaryColors.length >= dataIdx) ?
        this.extraLineSecondaryColors[dataIdx - 1] : Colors.random();
      let layer = null;

      if (this.showAsAntPath) {
        layer = window.L.polyline.antPath(self.toCoords(this.ctrl.data[dataIdx]), {
          'delay': this.antPathDelay,
          'dashArray': [10, 20],
          'weight': 5,
          'color': lineColor,
          'pulseColor': (this.useCustomAntPathColor ? secondaryLineColor : '#FFFFFF'),
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

  drawPolyLine() {
    if (this.showAsAntPath) {
      this.linesLayer = window.L.polyline.antPath(this.lineCoords, {
        'delay': this.antPathDelay,
        'dashArray': [10, 20],
        'weight': 5,
        'color': (this.useCustomAntPathColor ? this.antPathColor : this.lineColor),
        'pulseColor': (this.useCustomAntPathColor ? this.antPathPulseColor : '#FFFFFF'),
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

  updateCircles(data) {
    data.forEach((dataPoint) => {
      if (!dataPoint.locationName) return;

      const circle = _.find(this.circles, (cir) => {
        return cir.options.location === dataPoint.key;
      });

      if (circle) {
        circle.setRadius(this.calcCircleSize(dataPoint.value || 0));
        circle.setStyle({
          color: this.getColor(dataPoint.value),
          fillColor: this.getColor(dataPoint.value),
          fillOpacity: 0.5,
          location: dataPoint.key,
        });
        circle.unbindPopup();
        this.createPopup(circle, dataPoint.locationName, dataPoint.valueRounded);
      }
    });
  }

  createCircle(dataPoint) {
    const circle = window.L.circleMarker([dataPoint.locationLatitude, dataPoint.locationLongitude], {
      radius: this.calcCircleSize(dataPoint.value || 0),
      color: this.getColor(dataPoint.value),
      fillColor: this.getColor(dataPoint.value),
      fillOpacity: 0.5,
      location: dataPoint.key
    });
    if (dataPoint.url) {
      if (this.ctrl.panel.urlFollowOptions.openInNewWindow) {
        const name = '_blank';
        let specs = '';
        if (this.ctrl.panel.urlFollowOptions.useHeadlessWindow) {
          specs = 'menubar=0,resizable=1,location=0,titlebar=0,toolbar=0';
        }
        circle.on('click', () => {
          window.open(dataPoint.url, name, specs);
        });
      } else {
        circle.on('click', () => {
          window.location.replace(dataPoint.url);
        });
      }
    }

    const value = dataPoint.valueRounded;
    let label = '';
    if (dataPoint.label) {
      label = dataPoint.label;
    } else {
      const unit = value && value === 1 ? this.ctrl.panel.unitSingular : this.ctrl.panel.unitPlural;
      label = (dataPoint.locationName + ': ' + value + ' ' + (unit || '')).trim();
    }
    this.createPopup(circle, label);
    return circle;
  }

  calcCircleSize(dataPointValue) {
    const circleMinSize = parseInt(this.ctrl.panel.circleMinSize, 10) || 2;
    const circleMaxSize = parseInt(this.ctrl.panel.circleMaxSize, 10) || 30;

    if (this.ctrl.data[0].valueRange === 0) {
      return circleMaxSize;
    }

    const dataFactor = (dataPointValue - this.ctrl.data[0].lowestValue) / this.ctrl.data[0].valueRange;
    const circleSizeRange = circleMaxSize - circleMinSize;

    return (circleSizeRange * dataFactor) + circleMinSize;
  }

  createPopup(circle, label) {
    circle.bindPopup(label, {
      'offset': window.L.point(0, -2),
      'className': 'worldmap-popup',
      'closeButton': this.ctrl.panel.stickyLabels
    });

    circle.on('mouseover', function onMouseOver(evt) {
      const layer = evt.target;
      layer.bringToFront();
      this.openPopup();
    });

    if (!this.ctrl.panel.stickyLabels) {
      circle.on('mouseout', function onMouseOut() {
        circle.closePopup();
      });
    }
  }

  getColor(value) {
    for (let index = this.ctrl.data[0].thresholds.length; index > 0; index -= 1) {
      if (value >= this.ctrl.data[0].thresholds[index - 1]) {
        return this.ctrl.panel.colors[index];
      }
    }
    return _.first(this.ctrl.panel.colors);
  }

  resize() {
    if (this.map && this.isMapReady && this.map.getContainer()) {
      this.map.invalidateSize();
    }
  }

  panToMapCenter() {
    this.map.panTo([parseFloat(this.ctrl.panel.mapCenterLatitude), parseFloat(this.ctrl.panel.mapCenterLongitude)]);
    this.ctrl.mapCenterMoved = false;
  }

  removeLegend() {
    if (this.map && this.isMapReady && this.map.getContainer()) {
      this.legend.remove(this.map);
      this.legend = null;
    }
  }

  setMouseWheelZoom() {
    if (!this.ctrl.panel.mouseWheelZoom) {
      this.map.scrollWheelZoom.disable();
    } else {
      this.map.scrollWheelZoom.enable();
    }
  }

  addCircles(circles) {
    return window.L.layerGroup(circles).addTo(this.map);
  }

  removeCircles() {
    this.map.removeLayer(this.circlesLayer);
  }

  removeLines(layer) {
    this.map.removeLayer(layer);
  }

  showTrail(flag) {
    this.drawTrail = flag;
    if (!this.drawTrail) {
      this.clearPolyLine();
    }
  }

  setAntPathOptions(delay, useCustomColor, color, pulseColor) {
    this.useCustomAntPathColor = useCustomColor;
    this.antPathDelay = delay;
    this.antPathColor = color;
    this.antPathPulseColor = pulseColor;
  }

  setPathColors(color1, color2) {
    this.pathColor1 = color1;
    this.pathColor2 = color2;
  }

  setExtraLineColors(colors) {
    this.extraLineColors = colors;
  }

  setExtraLineSecondaryColors(colors) {
    this.extraLineSecondaryColors = colors;
  }

  setShowAsAntPath(flag) {
    this.showAsAntPath = flag;
  }

  setZoom(zoomFactor) {
    this.map.setZoom(parseInt(zoomFactor, 10));
  }

  remove() {
    this.circles = [];
    if (this.circlesLayer) this.removeCircles();
    if (this.legend) this.removeLegend();
    this.map.remove();
  }

  onMove = ((moveEvent) => {
    if (!moveEvent.target) {
      return;
    }
    this.setBoundsOnFirstLoad = false;
    this.ctrl.onBoundsChange(this.flattenBounds(moveEvent.target.getBounds(), 'move'));
  }).bind(this);

  onZoom = ((zoomEvent) => {
    if (!zoomEvent.target) {
      return;
    }
    this.setBoundsOnFirstLoad = false;
    this.ctrl.onBoundsChange(this.flattenBounds(zoomEvent.target.getBounds(), 'zoom'));
  }).bind(this);

  onResize = ((resizeEvent) => {
    if (!resizeEvent.target) {
      return;
    }
    this.ctrl.onBoundsChange(this.flattenBounds(resizeEvent.target.getBounds(), 'resize'));
  }).bind(this);

  flattenBounds(bounds, trigger) {
    if (!bounds) {
      return {};
    }
    const maxChangeDelta = this.calculateMaxChangeDelta(bounds);

    return {
      nortWest: {
        lat: bounds.getNorthWest().lat,
        lng: bounds.getNorthWest().lng
      },
      northEast: {
        lat: bounds.getNorthEast().lat,
        lng: bounds.getNorthEast().lng
      },
      southEast: {
        lat: bounds.getSouthEast().lat,
        lng: bounds.getSouthEast().lng
      },
      southWest: {
        lat: bounds.getSouthWest().lat,
        lng: bounds.getSouthWest().lng
      },
      triggeredBy: trigger,
      maxChangeDelta: maxChangeDelta
    };
  }

  calculateMaxChangeDelta(bounds) {
    let maxChangeDelta = 0;
    if (this.lastBounds) {
      const nwDist = window.L.CRS.Simple.distance(bounds.getNorthWest(), this.lastBounds.getNorthWest());
      if (nwDist > maxChangeDelta) {
        maxChangeDelta = nwDist;
      }
      const neDist = window.L.CRS.Simple.distance(bounds.getNorthEast(), this.lastBounds.getNorthEast());
      if (neDist > maxChangeDelta) {
        maxChangeDelta = neDist;
      }
      const seDist = window.L.CRS.Simple.distance(bounds.getSouthEast(), this.lastBounds.getSouthEast());
      if (seDist > maxChangeDelta) {
        maxChangeDelta = seDist;
      }
      const swDist = window.L.CRS.Simple.distance(bounds.getSouthWest(), this.lastBounds.getSouthWest());
      if (swDist > maxChangeDelta) {
        maxChangeDelta = swDist;
      }
      return maxChangeDelta;
    }
    this.lastBounds = bounds;
  }
}
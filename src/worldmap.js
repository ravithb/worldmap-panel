import _ from 'lodash';
/* eslint-disable id-length, no-unused-vars */
import L from './libs/leaflet';
/* eslint-disable id-length, no-unused-vars */
import {antPath} from './libs/leaflet-ant-path';

const tileServers = {
  'CartoDB Positron': { url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>', subdomains: 'abcd'},
  'CartoDB Dark': {url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>', subdomains: 'abcd'}
};

export default class WorldMap {
  constructor(ctrl, mapContainer) {
    this.ctrl = ctrl;
    this.mapContainer = mapContainer;
    this.circles = [];
    this.lineCoords = [];
    this.lineColor = _.first(this.ctrl.panel.colors);
    this.drawTrail = this.ctrl.panel.showTrail;
    this.antPathDelay = this.ctrl.panel.antPathDelay;
    this.useCustomAntPathColor = this.ctrl.panel.customAntPathColor;
    this.antPathColor = this.ctrl.panel.antPathColor;
    this.antPathPulseColor = this.ctrl.panel.antPathPulseColor;

    this.showAsAntPath = true;
    return this.createMap();
  }

  createMap() {
    const mapCenter = window.L.latLng(parseFloat(this.ctrl.panel.mapCenterLatitude), parseFloat(this.ctrl.panel.mapCenterLongitude));
    this.map = window.L.map(this.mapContainer, { worldCopyJump: true, center: mapCenter, zoom: parseInt(this.ctrl.panel.initialZoom, 10) || 1 });
    this.setMouseWheelZoom();

    const selectedTileServer = tileServers[this.ctrl.tileServer];
    window.L.tileLayer(selectedTileServer.url, {
      maxZoom: 18,
      subdomains: selectedTileServer.subdomains,
      reuseTiles: true,
      detectRetina: true,
      attribution: selectedTileServer.attribution
    }).addTo(this.map);
  }

  createLegend() {
    this.legend = window.L.control({position: 'bottomleft'});
    this.legend.onAdd = () => {
      this.legend._div = window.L.DomUtil.create('div', 'info legend');
      this.legend.update();
      return this.legend._div;
    };

    this.legend.update = () => {
      const thresholds = this.ctrl.data.thresholds;
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
    return _.filter(data, (o) => { return !(this.ctrl.panel.hideEmpty && _.isNil(o.value)) && !(this.ctrl.panel.hideZero && o.value === 0); });
  }

  clearCircles() {
    if (this.circlesLayer) {
      this.circlesLayer.clearLayers();
      this.removeCircles(this.circlesLayer);
      this.circles = [];
    }
  }

  drawCircles() {
    const data = this.filterEmptyAndZeroValues(this.ctrl.data);
    if (this.needToRedrawCircles(data)) {
      this.clearCircles();
      this.createCircles(data);
      this.clearPolyLine();
      if (this.drawTrail) {
        this.drawPolyLine();
      }
    } else {
      this.updateCircles(data);
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
  }

  drawPolyLine() {
    console.log('Coords : %o', this.lineCoords);
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

      const circle = _.find(this.circles, (cir) => { return cir.options.location === dataPoint.key; });

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

    this.createPopup(circle, dataPoint.locationName, dataPoint.valueRounded);
    return circle;
  }

  calcCircleSize(dataPointValue) {
    const circleMinSize = parseInt(this.ctrl.panel.circleMinSize, 10) || 2;
    const circleMaxSize = parseInt(this.ctrl.panel.circleMaxSize, 10) || 30;

    if (this.ctrl.data.valueRange === 0) {
      return circleMaxSize;
    }

    const dataFactor = (dataPointValue - this.ctrl.data.lowestValue) / this.ctrl.data.valueRange;
    const circleSizeRange = circleMaxSize - circleMinSize;

    return (circleSizeRange * dataFactor) + circleMinSize;
  }

  createPopup(circle, locationName, value) {
    const unit = value && value === 1 ? this.ctrl.panel.unitSingular : this.ctrl.panel.unitPlural;
    const label = (locationName + ': ' + value + ' ' + (unit || '')).trim();
    circle.bindPopup(label, {'offset': window.L.point(0, -2), 'className': 'worldmap-popup', 'closeButton': this.ctrl.panel.stickyLabels});

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
    for (let index = this.ctrl.data.thresholds.length; index > 0; index -= 1) {
      if (value >= this.ctrl.data.thresholds[index - 1]) {
        return this.ctrl.panel.colors[index];
      }
    }
    return _.first(this.ctrl.panel.colors);
  }

  resize() {
    this.map.invalidateSize();
  }

  panToMapCenter() {
    this.map.panTo([parseFloat(this.ctrl.panel.mapCenterLatitude), parseFloat(this.ctrl.panel.mapCenterLongitude)]);
    this.ctrl.mapCenterMoved = false;
  }

  removeLegend() {
    this.legend.remove(this.map);
    this.legend = null;
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

  removeLines() {
    this.map.removeLayer(this.linesLayer);
  }

  showTrail(flag) {
    console.log('CTRL: setTrail %o', flag);
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
}

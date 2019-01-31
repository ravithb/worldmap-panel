import './css/leaflet.css!';
import WorldMap from './worldmap';

export default function link(scope, elem, attrs, ctrl) {
  ctrl.events.on('render', () => {
    render();
    ctrl.renderingCompleted();
  });

  function render() {
    if (!ctrl.data) return;

    const mapContainer = elem.find('.mapcontainer');

    if (mapContainer[0].id.indexOf('{{') > -1) {
      return;
    }

    if (!ctrl.map) {
      ctrl.map = new WorldMap(ctrl, mapContainer[0]);
    }

    ctrl.map.focus();
    ctrl.map.resize();

    if (ctrl.mapCenterMoved) ctrl.map.panToMapCenter();

    if (!ctrl.map.legend && ctrl.panel.showLegend) ctrl.map.createLegend();

    if (ctrl.panel.locationData === 'geo json') {
      ctrl.map.drawGeoJson();
    } else {
      ctrl.map.drawCircles();
    }
  }
}

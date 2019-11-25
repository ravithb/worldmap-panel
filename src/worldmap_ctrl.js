/* eslint import/no-extraneous-dependencies: 0 */
/* eslint id-length: 0 */
/* eslint prefer-const: 0 */
/* eslint no-plusplus: 0 */
/* eslint eqeqeq: 0 */
import {
  MetricsPanelCtrl
} from 'app/plugins/sdk';
import TimeSeries from 'app/core/time_series2';
import kbn from 'app/core/utils/kbn';

import _ from 'lodash';
import mapRenderer from './map_renderer';
import DataFormatter from './data_formatter';
import './css/worldmap-panel.css!';
import Colors from './colors';
import {
  appEvents
} from 'app/core/core';

const panelDefaults = {
  maxDataPoints: 1,
  mapCenter: '(0°, 0°)',
  mapCenterLatitude: 0,
  mapCenterLongitude: 0,
  initialZoom: 1,
  valueName: 'total',
  circleMinSize: 2,
  circleMaxSize: 30,
  boundsChangeTriggerDelta: 0.5,
  locationData: 'countries',
  thresholds: '0,10',
  colors: ['rgba(245, 54, 54, 0.9)', 'rgba(237, 129, 40, 0.89)', 'rgba(50, 172, 45, 0.97)'],
  unitSingle: '',
  unitPlural: '',
  showLegend: true,
  mouseWheelZoom: false,
  showTrail: false,
  showAsAntPath: false,
  antPathDelay: 400,
  useCustomAntPathColor: false,
  antPathColor: 'rgba(50, 172, 45, 0.97)',
  antPathPulseColor: '#FFFFFF',
  extraLineColors: ['#ff4d4d', '#1aff8c'],
  extraLineSecondaryColors: ['#eeeeee', '#eeeeee'],
  mapTileServer: 'CartoDB',
  esMetric: 'Count',
  decimals: 0,
  hideEmpty: false,
  hideZero: false,
  stickyLabels: false,
  tableQueryOptions: {
    queryType: 'geohash',
    geohashField: 'geohash',
    latitudeField: 'latitude',
    longitudeField: 'longitude',
    metricField: 'metric',
    markerField: 'marker',
    timeField: 'time',
    sortByTime: true,
    customLabelField: 'label',
    urlField: 'url'
  },
  urlFollowOptions: {
    openInNewWindow: true,
    useHeadlessWindow: true
  },
  geoJsonOptions: {
    popupContentField: 'Name',
    clickDataField: null,
    labelField: null
  }
};

const mapCenters = {
  '(0°, 0°)': {
    mapCenterLatitude: 0,
    mapCenterLongitude: 0
  },
  'North America': {
    mapCenterLatitude: 40,
    mapCenterLongitude: -100
  },
  'Europe': {
    mapCenterLatitude: 46,
    mapCenterLongitude: 14
  },
  'West Asia': {
    mapCenterLatitude: 26,
    mapCenterLongitude: 53
  },
  'SE Asia': {
    mapCenterLatitude: 10,
    mapCenterLongitude: 106
  },
  'Last GeoHash': {
    mapCenterLatitude: 0,
    mapCenterLongitude: 0
  }
};

export default class WorldmapCtrl extends MetricsPanelCtrl {
  currentTileServer;
  context;

  constructor($scope, $injector, contextSrv, datasourceSrv, variableSrv) {
    super($scope, $injector);
    this.context = contextSrv;
    _.defaults(this.panel, panelDefaults);
    this.tileServer = this.panel.mapTileServer;
    this.currentTileServer = this.panel.mapTileServer;
    this.setMapProvider(contextSrv);
    this.variableSrv = variableSrv;

    this.dataFormatter = new DataFormatter(this, kbn);

    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('panel-teardown', this.onPanelTeardown.bind(this));
    this.events.on('data-snapshot-load', this.onDataSnapshotLoad.bind(this));

    appEvents.on('graph-hover', this.onGraphHover.bind(this), $scope);
    appEvents.on('graph-hover-clear', this.onGraphHoverClear.bind(this), $scope);

    this.loadLocationDataFromFile();
  }

  onGraphHover(ev) {
    if (this.data) {
      let i = 0;
      for (let d of this.data) {
        this.drawPinAtTimestamp(ev.pos.x, i, d);
        i++;
      }
    }
  }

  drawPinAtTimestamp(time, index, data) {
    let dataItem = this.findClosestMatch(time, data);
    if (dataItem) {
      // console.log(dataItem.time, dataItem.locationLatitude, dataItem.locationLongitude);
      this.map.drawPin(dataItem.locationLatitude, dataItem.locationLongitude);
    }
  }

  findClosestMatch(num, arr) {
    let mid;
    let lo = 0;
    let hi = arr.length - 1;
    while (hi - lo > 1) {
      mid = Math.floor((lo + hi) / 2);
      if (arr[mid].time < num) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    if (num - arr[lo].time <= arr[hi].time - num) {
      return arr[lo];
    }
    return arr[hi];
  }

  onGraphHoverClear() {
    if (this.map) {
      this.map.clearPins();
    }
  }

  setMapProvider(contextSrv) {
    switch (this.panel.mapTileServer) {
      case 'Open Street Maps':
        this.tileServer = 'Open Street Maps';
        break;
      case 'Stamen Maps':
        this.tileServer = 'Stamen Maps';
        break;
      case 'Esri(Standard)':
        this.tileServer = 'Esri Standard';
        break;
      case 'Esri(Transportation)':
        this.tileServer = 'Esri Transportation';
        break;
      case 'Esri(Terrain)':
        this.tileServer = 'Esri Terrain';
        break;
      case 'CartoDB':
      default:
        this.tileServer = contextSrv.user.lightTheme ? 'CartoDB Positron' : 'CartoDB Dark';
        break;
    }
    this.setMapSaturationClass();
  }

  changeBoundsChangeTriggerDelta() {
    if (this.panel.boundsChangeTriggerDelta < 0 || this.panel.boundsChangeTriggerDelta > 3) {
      this.panel.boundsChangeTriggerDelta = 0.5;
    }
  }

  changeMapProvider() {
    if (this.panel.mapTileServer !== this.currentTileServer) {
      this.setMapProvider(this.context);
      try {
        if (this.map) {
          this.map.remove();
          this.map = null;
        }
      } catch (ex) {
        console.log(ex);
      }

      this.currentTileServer = this.tileServer;
      this.render();
    }
  }

  setMapSaturationClass() {
    if (this.tileServer === 'CartoDB Dark') {
      this.saturationClass = 'map-darken';
    } else {
      this.saturationClass = '';
    }
  }

  loadLocationDataFromFile(reload) {
    if (this.map && !reload) return;

    if (this.panel.snapshotLocationData) {
      this.locations = this.panel.snapshotLocationData;
      return;
    }

    if (this.panel.locationData === 'jsonp endpoint') {
      if (!this.panel.jsonpUrl || !this.panel.jsonpCallback) return;

      window.$.ajax({
        type: 'GET',
        url: this.panel.jsonpUrl + '?callback=?',
        contentType: 'application/json',
        jsonpCallback: this.panel.jsonpCallback,
        dataType: 'jsonp',
        success: (res) => {
          this.locations = res;
          this.render();
        }
      });
    } else if (this.panel.locationData === 'json endpoint') {
      if (!this.panel.jsonUrl) return;

      window.$.getJSON(this.panel.jsonUrl).then((res) => {
        this.locations = res;
        this.render();
      });
    } else if (this.panel.locationData === 'table' || this.panel.locationData === 'geo json') {
      // .. Do nothing
    } else if (this.panel.locationData !== 'geohash' && this.panel.locationData !== 'json result') {
      window.$.getJSON('public/plugins/grafana-custom-worldmap-panel/data/' + this.panel.locationData + '.json')
        .then(this.reloadLocations.bind(this));
    }
  }

  reloadLocations(res) {
    this.locations = res;
    this.refresh();
  }

  showTableGeohashOptions() {
    return this.panel.locationData === 'table' && this.panel.tableQueryOptions.queryType === 'geohash';
  }

  showTableCoordinateOptions() {
    return this.panel.locationData === 'table' && this.panel.tableQueryOptions.queryType === 'coordinates';
  }

  onPanelTeardown() {
    if (this.map) this.map.remove();
  }

  onInitEditMode() {
    this.addEditorTab('Worldmap', 'public/plugins/grafana-custom-worldmap-panel/partials/editor.html', 2);
  }

  onDataReceived(dataList) {
    if (!dataList) return;

    if (this.dashboard.snapshot && this.locations) {
      this.panel.snapshotLocationData = this.locations;
    }

    const data = [];
    if (this.panel.locationData === 'geohash') {
      this.dataFormatter.setGeohashValues(dataList, data);
    } else if (this.panel.locationData === 'table') {
      const tableData = dataList.map(DataFormatter.tableHandler.bind(this));
      this.dataFormatter.setTableValues(tableData, data);
    } else if (this.panel.locationData === 'json result') {
      this.series = dataList;
      this.dataFormatter.setJsonValues(data);
    } else if (this.panel.locationData === 'geo json') {
      this.series = dataList;
      this.dataFormatter.setGeoJsonValues(data);
    } else {
      this.series = dataList.map(this.seriesHandler.bind(this));
      this.dataFormatter.setValues(data);
    }
    this.data = data;

    this.updateThresholdData();

    if (this.data && this.data.length > 0 &&
      this.data[0].length && this.panel.mapCenter === 'Last GeoHash') {
      this.centerOnLastGeoHash();
    } else {
      this.render();
    }
  }

  centerOnLastGeoHash() {
    mapCenters[this.panel.mapCenter].mapCenterLatitude = _.last(this.data[0]).locationLatitude;
    mapCenters[this.panel.mapCenter].mapCenterLongitude = _.last(this.data[0]).locationLongitude;
    this.setNewMapCenter();
  }

  onDataSnapshotLoad(snapshotData) {
    this.onDataReceived(snapshotData);
  }

  seriesHandler(seriesData) {
    const series = new TimeSeries({
      datapoints: seriesData.datapoints,
      alias: seriesData.target,
    });

    series.flotpairs = series.getFlotPairs(this.panel.nullPointMode);
    return series;
  }

  setNewMapCenter() {
    if (this.panel.mapCenter !== 'custom') {
      this.panel.mapCenterLatitude = mapCenters[this.panel.mapCenter].mapCenterLatitude;
      this.panel.mapCenterLongitude = mapCenters[this.panel.mapCenter].mapCenterLongitude;
    }
    this.mapCenterMoved = true;
    this.render();
  }

  setZoom() {
    this.map.setZoom(this.panel.initialZoom || 1);
  }

  toggleLegend() {
    if (!this.panel.showLegend) {
      this.map.removeLegend();
    }
    this.render();
  }

  toggleMouseWheelZoom() {
    this.map.setMouseWheelZoom();
    this.render();
  }

  toggleStickyLabels() {
    this.map.clearCircles();
    this.render();
  }

  toggleSortByTime() {
    this.map.clearCircles();
    this.render();
  }

  toggleShowTrail() {
    this.map.showTrail(this.panel.showTrail);
  }

  toggleShowAsAntPath() {
    this.map.setShowAsAntPath(this.panel.showAsAntPath);
  }

  changeAntpathOptions() {
    this.map.setAntPathOptions(this.panel.antPathDelay,
      this.panel.useCustomAntPathColor,
      this.panel.antPathColor,
      this.panel.antPathPulseColor);
    this.render();
  }

  changePathColors() {
    if (this.panel.pathColor1 && this.panel.pathColor2) {
      this.map.setPathColors(this.panel.pathColor1, this.panel.pathColor2);
    }
  }

  addExtraLineColor() {
    this.panel.extraLineColors.push(Colors.random());
    this.panel.extraLineSecondaryColors.push(Colors.random());
    this.render();
  }

  removeLastExtraLineColor() {
    if (this.panel.extraLineColors.length > 0) {
      const removed = this.panel.extraLineColors.pop();
      if (removed && this.panel.extraLineSecondaryColors.length > 0) {
        this.panel.extraLineSecondaryColors.pop();
      }
      this.render();
    }
  }

  changeExtraLineColors() {
    this.map.setExtraLineColors(this.panel.extraLineColors);
  }

  changeExtraLineSecondaryColors() {
    this.map.setExtraLineSecondaryColors(this.panel.extraLineSecondaryColors);
  }

  changeThresholds() {
    this.updateThresholdData();
    this.map.legend.update();
    this.render();
  }

  updateThresholdData() {
    if (!this.data || this.data.length === 0) {
      return;
    }
    this.data[0].thresholds = this.panel.thresholds.split(',').map((strValue) => {
      return Number(strValue.trim());
    });
    while (_.size(this.panel.colors) > _.size(this.data[0].thresholds) + 1) {
      // too many colors. remove the last one.
      this.panel.colors.pop();
    }
    while (_.size(this.panel.colors) < _.size(this.data[0].thresholds) + 1) {
      // not enough colors. add one.
      const newColor = 'rgba(50, 172, 45, 0.97)';
      this.panel.colors.push(newColor);
    }
  }

  changeLocationData() {
    this.loadLocationDataFromFile(true);

    if (this.panel.locationData === 'geohash') {
      this.render();
    }
  }

  onBoundsChange(boundsObj) {
    if (boundsObj.maxChangeDelta < 0.5) {
      console.log('bounds change delta %o is too small to update variable', boundsObj.maxChangeDelta);
      return;
    }
    const boundsJson = boundsObj;
    const boundsVar = _.find(this.variableSrv.variables, (check) => {
      return check.name === 'bounds';
    });
    if (boundsVar) {
      this.variableSrv.setOptionAsCurrent(boundsVar, {
        text: boundsJson,
        value: boundsJson
      });
      this.variableSrv.variableUpdated(boundsVar, true);
      // console.log('variable set to %o', boundsJson);
      // console.log(boundsVar);
      // console.log(this);
    } else {
      console.log("no variable 'bounds'");
    }
  }

  emitClick(clickData) {
    if (!clickData) {
      return;
    }
    const clickDataVar = _.find(this.variableSrv.variables, (check) => {
      return check.name === 'clickData';
    });
    if (clickDataVar) {
      this.variableSrv.setOptionAsCurrent(clickDataVar, {
        text: clickData,
        value: clickData
      });
      this.variableSrv.variableUpdated(clickDataVar, true);
      // console.log('variable set to %o', boundsJson);
      // console.log(boundsVar);
      // console.log(this);
    } else {
      console.log("no variable 'clickData'");
    }
  }

  /* eslint class-methods-use-this: 0 */
  notEmpty(url) {
    return (url && url.trim().length > 0);
  }

  /* eslint class-methods-use-this: 0 */
  link(scope, elem, attrs, ctrl) {
    mapRenderer(scope, elem, attrs, ctrl);
  }
}

WorldmapCtrl.templateUrl = 'module.html';
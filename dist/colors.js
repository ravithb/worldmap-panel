'use strict';

System.register([], function (_export, _context) {
  "use strict";

  var _createClass, colors, Colors;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [],
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

      colors = ['#00ffff', '#f0ffff', '#f5f5dc', '#000000', '#0000ff', '#a52a2a', '#00ffff', '#00008b', '#008b8b', '#a9a9a9', '#006400', '#bdb76b', '#8b008b', '#556b2f', '#ff8c00', '#9932cc', '#8b0000', '#e9967a', '#9400d3', '#ff00ff', '#ffd700', '#008000', '#4b0082', '#f0e68c', '#add8e6', '#e0ffff', '#90ee90', '#d3d3d3', '#ffb6c1', '#ffffe0', '#00ff00', '#ff00ff', '#800000', '#000080', '#808000', '#ffa500', '#ffc0cb', '#800080', '#800080', '#ff0000', '#c0c0c0', '#ffffff', '#ffff00'];

      Colors = function () {
        function Colors() {
          _classCallCheck(this, Colors);
        }

        _createClass(Colors, null, [{
          key: 'random',
          value: function random() {
            console.log(colors);
            return colors[Math.floor(Math.random() * colors.length)];
          }
        }]);

        return Colors;
      }();

      _export('default', Colors);
    }
  };
});
//# sourceMappingURL=colors.js.map

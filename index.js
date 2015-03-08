(function () {
	var xml = require('node-xml');
	var fs = require('fs');
	
	function parseJUnitXML(filename, out) {
		out = out || console;

		var data = {};
		var current = {};

		function noop(){};

		var dataCollector = {
			testsuite: function(attrs, prefix, uri, namespaces) {
				data[attrs.name] = data[attrs.name] || {
					attrs: attrs,
					testcases: {}
				};
				current.testsuite = data[attrs.name];
				current.testcases = data[attrs.name].testcases;
			},
			properties: function(attrs, prefix, uri, namespaces) {
				current.testsuite.properties = {};
			},
			property: function(attrs, prefix, uri, namespaces) {
				current.testsuite.properties[attrs.name] = attrs.value;
			},
			testcase: function(attrs, prefix, uri, namespaces) {
				var name = attrs.classname + attrs.name;
				if (current.testcases[name]) {
					current.testcases[name].duplicates = (current.testcases[name].duplicates || 0) + 1;
					out.log('WARNING: duplicate test name: ' + name);
					return;
				}

				current.testcase = current.testcases[name] = attrs;
			},
			skipped: function(attrs, prefix, uri, namespaces) {
				current.testcase.skipped = true;
			},
			failure: function(attrs, prefix, uri, namespaces) {
				current.testcase.failure = true;
			},
			'system-out': noop,
			'system-err': noop,
			'testsuites': noop
		};

		function attrsArrToMap(attrsArr) {
			return attrsArr.reduce(function(map, attr){
				map[attr[0]] = (attr.length > 1 ? attr[1] : true);
				return map;
			}, {});
		}

		var parser = new xml.SaxParser(function(cb) {
		  cb.onStartElementNS(function(elem, attrs, prefix, uri, namespaces) {
		      if (dataCollector[elem]) {
		      	dataCollector[elem](attrsArrToMap(attrs), prefix, uri, namespaces);
		      } else {
		      	out.log('<UNHANDLED>element: ' + elem + '</UNHANDLED>');
		      }
		  });
		  cb.onWarning(function(msg) {
		      out.log('<WARNING>'+msg+"</WARNING>");
		  });
		  cb.onError(function(msg) {
		      out.log('<ERROR>'+JSON.stringify(msg)+"</ERROR>");
		  });
		});

		var content = fs.readFileSync(filename).toString();
		parser.parseString(content);

		return data;
	}

	exports.parse = parseJUnitXML;
})()
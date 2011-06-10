/**
 * Fusion.Layers.MapGuide
 *
 * $Id: MapGuide.js 2290 2010-11-25 05:52:09Z hubu $
 *
 * Copyright (c) 2007, DM Solutions Group Inc.
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

/***************************************************************************
* Class: Fusion.Layers.MapGuide
*
* Implements the map widget for MapGuide Open Source services.
*/

Fusion.Layers.MapGuide = OpenLayers.Class(Fusion.Layers, {
    arch: 'MapGuide',
    session: [null],
    aShowLayers: null,
    aHideLayers: null,
    aShowGroups: null,
    aHideGroups: null,
    aRefreshLayers: null,
    sActiveLayer: null,
    selectionType: 'INTERSECTS',
    bSelectionOn: false,
    oSelection: null,
    selectionAsOverlay: true,
    useAsyncOverlay: false,
    defaultFormat: 'PNG',
    oLayerOL2: false,   //a layer object for tiled maps that also contains dynamic layers
    alternateHostNames: null, //a comma-delimited list of alternate host names to use

    initialize: function(map, mapTag, isMapWidgetLayer) {
        // console.log('MapGuide.initialize');
        Fusion.Layers.prototype.initialize.apply(this, arguments);

        var newTheme = Fusion.getQueryParam('theme');
        if (newTheme != '') {
          this.sMapResourceId = newTheme;
          //clear the query param after it has been used once 
          Fusion.queryParams['theme'] = null;
        }

        this.registerEventID(Fusion.Event.MAP_SESSION_CREATED);

        this.mapInfo = mapTag.mapInfo;
        this.imageFormat = mapTag.extension.ImageFormat ? mapTag.extension.ImageFormat[0] : this.defaultFormat;
        this.selectionType = mapTag.extension.SelectionType ? mapTag.extension.SelectionType[0] : 'INTERSECTS';
        this.selectionColor = mapTag.extension.SelectionColor ? mapTag.extension.SelectionColor[0] : '';
        this.selectionFormat = mapTag.extension.SelectionFormat ? mapTag.extension.SelectionFormat[0] : 'PNG';
        if (mapTag.extension.SelectionAsOverlay && mapTag.extension.SelectionAsOverlay[0] == 'false') {
          this.selectionAsOverlay = false;
        }
        if (!this.bIsMapWidgetLayer) {
          this.selectionAsOverlay = false;
        }

        //add in the handler for CTRL-click actions for the map, not an overviewmap
        if (this.bIsMapWidgetLayer) {
          var ctrlClickEnabled = true;
          if (mapTag.extension.DisableCtrlClick && mapTag.extension.DisableCtrlClick[0] == 'true') {
              ctrlClickEnabled = false;
          }
          if (ctrlClickEnabled) {
            this.map = this.mapWidget.oMapOL;
            this.handler = new OpenLayers.Handler.Click(this,
                {click: OpenLayers.Function.bind(this.mouseUpCRTLClick, this)},
                {keyMask: OpenLayers.Handler.MOD_CTRL});
            this.handler.activate();
            this.nTolerance = 2; //pixels, default pixel tolernace for a point click; TBD make this configurable
          }
        }
        
        //Store the list of alternate host names
        if (mapTag.layerOptions.AlternateHostNames) {
            this.alternateHostNames = mapTag.layerOptions.AlternateHostNames;
        }
        
        rootOpts = {
          displayInLegend: this.bDisplayInLegend,
          expandInLegend: this.bExpandInLegend,
          legendLabel: this._sMapname,
          uniqueId: 'layerRoot',
          groupName: 'layerRoot',
          visible: true,
          actuallyVisible: true
          //TODO: set other opts for group initialization as required
        };
        this.layerRoot = new Fusion.Layers.Group(rootOpts,this);

        this.keepAliveInterval = parseInt(mapTag.extension.KeepAliveInterval ? mapTag.extension.KeepAliveInterval[0] : 300);
        this.noCache = true;

        var sid = Fusion.sessionId;
        if (sid) {
            this.session[0] = sid;
            this.mapSessionCreated();
        } else {
            this.createSession();
        }
    },

    createSession: function() {
        if (!this.session[0]) {
            this.session[0] = this;
            var sl = Fusion.getScriptLanguage();
            var scriptURL = 'layers/' + this.arch + '/' + sl + '/CreateSession.' + sl;
            var options = {onSuccess: OpenLayers.Function.bind(this.createSessionCB, this)};
            Fusion.ajaxRequest(scriptURL, options);
        }
        if (this.session[0] instanceof Fusion.Layers.MapGuide) {
            // console.log('register for event');
            this.session[0].registerForEvent(Fusion.Event.MAP_SESSION_CREATED,
                OpenLayers.Function.bind(this.mapSessionCreated, this));
        } else {
            this.mapSessionCreated();
        }
    },

    createSessionCB: function(xhr) {
        if (xhr.status == 200) {
            var o;
            eval('o='+xhr.responseText);
            this.session[0] = o.sessionId;
            var acceptLang = o.acceptLanguage.split(',');
            //IE - en-ca,en-us;q=0.8,fr;q=0.5,fr-ca;q=0.3
            for (var i=0; i<acceptLang.length; ++i) {
              var locale = acceptLang[i].split(";");
              Fusion.initializeLocale(locale[0]);
              break;
            }
            this.triggerEvent(Fusion.Event.MAP_SESSION_CREATED);
        }
    },

    mapSessionCreated: function() {
        if (this.sMapResourceId != '') {
          var options = {};
          if (this.bIsMapWidgetLayer) {
            var showlayers = Fusion.getQueryParam('showlayers');
            Fusion.queryParams['showlayers'] = null;
            var hidelayers = Fusion.getQueryParam('hidelayers');
            Fusion.queryParams['hidelayers'] = null;
            var showgroups = Fusion.getQueryParam('showgroups');
            Fusion.queryParams['showgroups'] = null;
            var hidegroups = Fusion.getQueryParam('hidegroups');
            Fusion.queryParams['hidegroups'] = null;
            var options = {
              showlayers: showlayers == '' ? [] : showlayers.split(','),
              hidelayers: hidelayers == '' ? [] : hidelayers.split(','),
              showgroups: showgroups == '' ? [] : showgroups.split(','),
              hidegroups: hidegroups == '' ? [] : hidegroups.split(',')
            };
        }
          this.loadMap(this.sMapResourceId, options);
        }
        this.keepAliveTimer = window.setInterval(OpenLayers.Function.bind(this.pingServer, this), this.keepAliveInterval * 1000);
    },

    sessionReady: function() {
        return (typeof this.session[0] == 'string');
    },

    getSessionID: function() {
        return this.session[0];
    },

    loadMap: function(resourceId, options) {
        this.bMapLoaded = false;

        if (!this.sessionReady()) {
            this.sMapResourceId = resourceId;
            return;
        }

        this.triggerEvent(Fusion.Event.LAYER_LOADING);
        this.mapWidget._addWorker();

        this._fScale = -1;
        this._nDpi = 96;

        options = options || {};

        this.aShowLayers = options.showlayers || [];
        this.aHideLayers = options.hidelayers || [];
        this.aShowGroups = options.showgroups || [];
        this.aHideGroups = options.hidegroups || [];
        this.aRefreshLayers = options.refreshlayers || [];
        this.aLayers = [];

        this.oSelection = null;
        this.aSelectionCallbacks = [];
        this._bSelectionIsLoading = false;

        var sl = Fusion.getScriptLanguage();
        var loadmapScript = 'layers/' + this.arch + '/' + sl  + '/LoadMap.' + sl;

        var sessionid = this.getSessionID();

        var params = {'mapid': resourceId, "session": sessionid};
        var options = {onSuccess: OpenLayers.Function.bind(this.mapLoaded,this),
                       parameters:params};
        Fusion.ajaxRequest(loadmapScript, options);
    },

    mapLoaded: function(r) {
        if (r.status == 200) {
            var o;
            eval('o='+r.responseText);
            this._sResourceId = o.mapId;
            this._sMapname = o.mapName;
            this._sMapTitle = o.mapTitle;
            this.mapWidget.setMetersPerUnit(o.metersPerUnit);
            this.mapWidget.setBackgroundColor(o.backgroundColor);

            var version = o.siteVersion;
            var bits = version.split('.');
            this.siteVersion = new Array(parseInt(bits[0]),
                                          parseInt(bits[1]),
                                          parseInt(bits[2]),
                                          parseInt(bits[3])
            );


            this.mapTag.layerOptions.maxExtent = OpenLayers.Bounds.fromArray(o.extent);

            this.layerRoot.clear();
            this.layerRoot.legendLabel = this._sMapTitle;
            this.layerRoot.displayInLegend = true;
            this.layerRoot.expandInLegend = true;

            this.parseMapLayersAndGroups(o);

            this.minScale = 1.0e10;
            this.maxScale = 0;
            for (var i=0; i<this.aLayers.length; i++) {
              this.minScale = Math.min(this.minScale, this.aLayers[i].minScale);
              this.maxScale = Math.max(this.maxScale, this.aLayers[i].maxScale);
            }
            //a scale value of 0 is undefined
            if (this.minScale <= 0) {
              this.minScale = 1.0;
            }

            for (var i=0; i<this.aShowLayers.length; i++) {
                var layer =  this.layerRoot.findLayerByAttribute('layerName', this.aShowLayers[i]);
                if (layer) {
                    this.aShowLayers[i] = layer.uniqueId;
                } else {
                    this.aShowLayers[i] = '';
                }
            }
            for (var i=0; i<this.aHideLayers.length; i++) {
                var layer =  this.layerRoot.findLayerByAttribute('layerName', this.aHideLayers[i]);
                if (layer) {
                    this.aHideLayers[i] = layer.uniqueId;
                } else {
                    this.aHideLayers[i] = '';
                }
            }

            for (var i=0; i<this.aShowGroups.length; i++) {
                var group =  this.layerRoot.findGroupByAttribute('groupName', this.aShowGroups[i]);
                if (group) {
                    this.aShowGroups[i] = group.uniqueId;
                } else {
                    this.aShowGroups[i] = '';
                }
            }

            for (var i=0; i<this.aHideGroups.length; i++) {
                var group =  this.layerRoot.findGroupByAttribute('groupName', this.aHideGroups[i]);
                if (group) {
                    this.aHideGroups[i] = group.uniqueId;
                } else {
                    this.aHideGroups[i] = '';
                }
            }

            if (o.hasBaseMapLayers && this.bIsMapWidgetLayer) {	//Use tile if there is base layer and in main map
                this.bSingleTile = false;
            }

            if (!this.bSingleTile) {
              if (o.groups.length >0) {
                this.bSingleTile = false;
                this.noCache = false;
                this.groupName = o.groups[0].groupName;  //assumes only one group for now
                this.mapWidget.registerForEvent(Fusion.Event.MAP_EXTENTS_CHANGED,
                    OpenLayers.Function.bind(this.mapExtentsChanged, this));
              } else {
                this.bSingleTile = true;
              }
            }

            //set projection units and code if supplied
            var wktProj;
            if (o.wkt && o.wkt.length > 0) {
              wktProj = new OpenLayers.Projection(o.wkt);
            } else if (o.epsg != 0) {
              this.mapTag.layerOptions.projection = "EPSG:" + o.epsg;
            } else {
              //default to the local non-projected system if not otherwise specified
              o.wkt = "LOCAL_CS[\"Non-Earth (Meter)\",LOCAL_DATUM[\"Local Datum\",0],UNIT[\"Meter\", 1],AXIS[\"X\",EAST],AXIS[\"Y\",NORTH]]";
              wktProj = new OpenLayers.Projection(o.wkt);
            }
            //TODO: consider passing the metersPerUnit value into the framework
            //to allow for scaling that doesn't match any of the pre-canned units
            this.mapTag.layerOptions.units = Fusion.getClosestUnits(o.metersPerUnit);

            //add in scales array if supplied
            if (o.FiniteDisplayScales && o.FiniteDisplayScales.length>0) {
              this.scales = o.FiniteDisplayScales;
              this.mapWidget.fractionalZoom = false;
              this.mapWidget.oMapOL.fractionalZoom = false;
            }

            //remove this layer if it was already created
            if (this.oLayerOL) {
                this.oLayerOL.events.unregister("loadstart", this, this.loadStart);
                this.oLayerOL.events.unregister("loadend", this, this.loadEnd);
                this.oLayerOL.events.unregister("loadcancel", this, this.loadEnd);
                this.oLayerOL.destroy();
            }

            this.oLayerOL = this.createOLLayer(this._sMapname, this.bSingleTile,2,false);
            if (wktProj) {
              this.oLayerOL.projection = wktProj;
            }
            this.oLayerOL.events.register("loadstart", this, this.loadStart);
            this.oLayerOL.events.register("loadend", this, this.loadEnd);
            this.oLayerOL.events.register("loadcancel", this, this.loadEnd);

            
            //remove the dynamic overlay layer if it was already created
            if (this.oLayerOL2) {
                this.oLayerOL2.destroy();
            }

            //this is to distinguish between a regular map and an overview map
            this.bMapLoaded = true;
            if (this.bIsMapWidgetLayer) {
                this.mapWidget.addMap(this);
                
                //if we have a tiled map that also contains dynamic layers, we need to create
                //an additional overlay layer to render them on top of the tiles
                if(!this.bSingleTile && o.hasDynamicLayers) {
                    this.oLayerOL2 = this.createOLLayer(this._sMapname + "_DynamicOverlay",true,2,true);
                    this.mapWidget.oMapOL.addLayer(this.oLayerOL2);
                    this.oLayerOL2.setVisibility(true);
                }
            }
        }
        this.mapWidget._removeWorker();
        this.triggerEvent(Fusion.Event.LAYER_LOADED);

    },

//TBD: this function not yet converted for OL
    reloadMap: function() {

        this.mapWidget._addWorker();
        //console.log('loadMap: ' + resourceId);
        this.aShowLayers = [];
        this.aHideLayers = [];
        this.aShowGroups = [];
        this.aHideGroups = [];
        this.aRefreshLayers = [];
        this.layerRoot.clear();
        var oldLayers = $A(this.aLayers);
        this.aLayers = [];

        var sl = Fusion.getScriptLanguage();
        var loadmapScript = 'layers/' + this.arch + '/' + sl  + '/LoadMap.' + sl;

        var sessionid = this.getSessionID();

        var params = {'mapname': this._sMapname, 'session': sessionid};
        var options = {
              onSuccess: OpenLayers.Function.bind(this.mapReloaded,this,oldLayers),
              onException: OpenLayers.Function.bind(this.reloadFailed, this),
              parameters: params};
        Fusion.ajaxRequest(loadmapScript, options);
    },

    reloadFailed: function(r) {
      Fusion.reportError( new Fusion.Error(Fusion.Error.FATAL,
        OpenLayers.i18n('mapLoadError', {'error':r.transport.responseText})));
      this.mapWidget._removeWorker();
    },

    /**
     * Function: loadScaleRanges
     *
     * This function should be called after the map has loaded. It
     * loads the scale ranges for each layer. It is for now only
     * used by the legend widget.
     */

    loadScaleRanges: function(userFunc) {
        var sl = Fusion.getScriptLanguage();
        var loadmapScript = 'layers/' + this.arch + '/' + sl  + '/LoadScaleRanges.' + sl;

        var preCacheIcons = true;
        
        //Logic snipped from browserdetect.js since it doesn't seem to be used by Fusion in split or single-file mode.
        var agent = navigator.userAgent.toLowerCase();
        var msieIndex = agent.indexOf("msie");
        if(msieIndex != -1)
        {
            msie = true;
            var msieVersion = agent.substr(msieIndex + 5, 1);
            if(parseFloat(msieVersion) <= 7) 
            {
                preCacheIcons = false; //IE <= 7: No pre-caching for you because you don't support data URIs
            }
        }

        var sessionid = this.getSessionID();

        var params = {'mapname': this._sMapname, "session": sessionid, "preCacheIcons": preCacheIcons};
        var options = {onSuccess: OpenLayers.Function.bind(this.scaleRangesLoaded,this, userFunc),
                       parameters:params};
        Fusion.ajaxRequest(loadmapScript, options);
    },

    scaleRangesLoaded: function(userFunc, r)
    {
        if (r.status == 200)
        {
            var o;
            eval('o='+r.responseText);
            if (o.layers && o.layers.length > 0)
            {
                var iconOpt = {
                    url: o.icons_url || null,
                    width: o.icons_width || 16,
                    height: o.icons_height || 16
                };
                for (var i=0; i<o.layers.length; i++)
                {
                    var oLayer = this.getLayerById(o.layers[i].uniqueId);
                    if (oLayer)
                    {
                        oLayer.scaleRanges = [];
                        for (var j=0; j<o.layers[i].scaleRanges.length; j++)
                        {
                            var scaleRange = new Fusion.Layers.ScaleRange(o.layers[i].scaleRanges[j],
                                                                                 oLayer.layerType, iconOpt);
                            oLayer.scaleRanges.push(scaleRange);
                        }
                    }
                }
            }

            userFunc();
        }
    },
//TBD: this function not yet converted for OL
    mapReloaded: function(oldLayers,r) {
        if (r.status == 200) {
            var o;
            eval('o='+r.responseText);
            this.parseMapLayersAndGroups(o);
            for (var i=0; i<this.aLayers.length; ++i) {
              var newLayer = this.aLayers[i];
              for (var j=0; j<oldLayers.length; ++j){
                if (oldLayers[j].uniqueId == newLayer.uniqueId) {
                  newLayer.selectedFeatureCount = oldLayers[j].selectedFeatureCount;
                  newLayer.noCache = oldLayers[j].noCache;
                  break;
                }
              }
            }
            this.mapWidget.triggerEvent(Fusion.Event.MAP_RELOADED);
            this.drawMap();
        }
        this.mapWidget._removeWorker();
    },

    reorderLayers: function(aLayerIndex) {
        var sl = Fusion.getScriptLanguage();
        var loadmapScript = 'layers/' + this.arch + '/' + sl  + '/SetLayers.' + sl;

        var params = {
            'mapname': this._sMapname,
            'session': this.getSessionID(),
            'layerindex': aLayerIndex.join()
        };

        var options = {
            onSuccess: OpenLayers.Function.bind(this.mapLayersReset, this, aLayerIndex),
            parameters: params};
        Fusion.ajaxRequest(loadmapScript, options);
    },

    mapLayersReset: function(aLayerIndex,r) {
      if (r.status == 200) {
        var o;
        eval('o='+r.responseText);
            if (o.success) {
                var layerCopy = $A(this.aLayers);
                this.aLayers = [];
                this.aVisibleLayers = [];
          for (var i=0; i<aLayerIndex.length; ++i) {
            this.aLayers.push( layerCopy[ aLayerIndex[i] ] );
            if (this.aLayers[i].visible) {
                this.aVisibleLayers.push(this.aLayers[i].layerName);
            }
          }

                this.drawMap();
                this.triggerEvent(Fusion.Event.MAP_LAYER_ORDER_CHANGED);
            } else {
                alert(OpenLayers.i18n('setLayersError', {'error':o.layerindex}));
            }
        }
    },

    parseMapLayersAndGroups: function(o) {
        for (var i=0; i<o.groups.length; i++) {
            var group = new Fusion.Layers.Group(o.groups[i], this);
            var parent;
            if (group.parentUniqueId != '') {
                parent = this.layerRoot.findGroupByAttribute('uniqueId', group.parentUniqueId);
            } else {
                parent = this.layerRoot;
            }
            parent.addGroup(group, this.bLayersReversed);
        }

        for (var i=0; i<o.layers.length; i++) {
            var layer = new Fusion.Layers.Layer(o.layers[i], this);
            var parent;
            if (layer.parentGroup != '') {
                parent = this.layerRoot.findGroupByAttribute('uniqueId', layer.parentGroup);
            } else {
                parent = this.layerRoot;
            }
            parent.addLayer(layer, this.bLayersReversed);
            this.aLayers.push(layer);
        }
    },

    drawMap: function() {
        if (!this.bMapLoaded) {
            return;
        }

        var params = {
          ts : (new Date()).getTime(),  //add a timestamp to prevent caching on the server
          showLayers : this.aShowLayers.length > 0 ? this.aShowLayers.toString() : null,
          hideLayers : this.aHideLayers.length > 0 ? this.aHideLayers.toString() : null,
          showGroups : this.aShowGroups.length > 0 ? this.aShowGroups.toString() : null,
          hideGroups : this.aHideGroups.length > 0 ? this.aHideGroups.toString() : null,
          refreshLayers : this.aRefreshLayers.length > 0 ? this.aRefreshLayers.toString() : null
        };

        this.aShowLayers = [];
        this.aHideLayers = [];
        this.aShowGroups = [];
        this.aHideGroups = [];
        this.aRefreshLayers = [];

        if(this.oLayerOL2) {
            this.oLayerOL2.mergeNewParams(params);
        } else {
            this.oLayerOL.mergeNewParams(params);
        }
        
    },

    drawSelection: function() {
        if (this.queryLayer) {
            this.queryLayer.redraw(true);
        } else {
            this.drawMap();
        }
    },

    /**
     * Function: createOLLayer
     *
     * Returns an OpenLayers MapGuide layer object
     */
    createOLLayer: function(layerName, bSingleTile, behavior, forceAsOverlay) {
      /* prevent the useOverlay flag based on MapGuide config element */
      this.useAsyncOverlay = Fusion.getConfigurationItem('mapguide', 'useAsyncOverlay');
      if (!this.useAsyncOverlay) {          //v2.0.1 or earlier
        this.selectionAsOverlay = false;
      }
      
      var layerOptions = {
        maxResolution: 'auto',
        useOverlay: this.selectionAsOverlay,
        useAsyncOverlay: this.useAsyncOverlay,
        ratio: this.ratio
      };
      if ((behavior & 1) == 0 && !/WebKit/.test(navigator.userAgent)) {
        layerOptions.transitionEffect = 'resize';
      }

      //add in scales array if supplied
      if (this.scales && this.scales.length>0) {
        layerOptions.scales = this.scales;
      }
      if (this.maxScale != Infinity) {
        layerOptions.minScale = this.maxScale;    //OL interpretation of min/max scale is reversed from Fusion
      } else {
        if (this.mapWidget.minScale) {
          layerOptions.minScale = this.mapWidget.maxScale;
        }// otherwise minscale is set automatically by OL
      }
      //only set both max and min scale when not using scales array
      if (!this.mapWidget.oMapOL.scales && !this.scales) {
        layerOptions.maxScale = this.minScale;
      }

      layerOptions.singleTile = bSingleTile;
      OpenLayers.Util.extend(layerOptions, this.mapTag.layerOptions);

      var params = {};
      if ( bSingleTile ) {
        params = {        //single tile params
          session: this.getSessionID(),
          mapname: this._sMapname,
          format: this.imageFormat,
          behavior: behavior,
          clientagent: this.clientAgent
        };
        params.showLayers = this.aShowLayers.length > 0 ? this.aShowLayers.toString() : null;
        params.hideLayers = this.aHideLayers.length > 0 ? this.aHideLayers.toString() : null;
        params.showGroups = this.aShowGroups.length > 0 ? this.aShowGroups.toString() : null;
        params.hideGroups = this.aHideGroups.length > 0 ? this.aHideGroups.toString() : null;
        params.refreshLayers = this.aRefreshLayers.length > 0 ? this.aRefreshLayers.toString() : null;

        if (behavior == 5) {
          params.selectioncolor = this.selectionColor;
          params.format = this.selectionFormat;
        }
        
        if(forceAsOverlay)
        {
            layerOptions.isBaseLayer = false;
        }

      } else {
        params = {      //tiled version
          mapdefinition: this._sResourceId,
          basemaplayergroupname: this.groupName,  //assumes only one group for now
          session: this.getSessionID(),
          clientagent: this.clientAgent
        };
      }
      
      //Fix for IE6 PNG transparency
      if (params.format && params.format.toLowerCase().indexOf('png') >= 0) {
        layerOptions.alpha = true;
      }

      var url;
      if ( !bSingleTile && layerOptions.useHttpTile) {
        url = Fusion.getConfigurationItem('mapguide', 'tileCacheUrl');
      } else {
        url = Fusion.getConfigurationItem('mapguide', 'mapAgentUrl');
      }
      
      if (this.alternateHostNames)
      {
        var hosts = this.alternateHostNames.split(",");
        var httpIndex = url.indexOf("http://") + 7;
        if (httpIndex < 7) {
            httpIndex = url.indexOf("https://") + 8;
        }
        var proto = url.substring(0, httpIndex);
        var relIndex = url.indexOf("/", httpIndex+1);
        var relPath = url.substring(relIndex);
        
        layerOptions.alternateUrls = [];
        
        for (var i = 0; i < hosts.length; i++) {
            var altUrl = proto + hosts[i] + relPath;
            layerOptions.alternateUrls.push(altUrl);
        }
      }
      
      
      var oNewLayerOL = new OpenLayers.Layer.MapGuide( layerName, url, params, layerOptions );
      return oNewLayerOL;
    },

    /**
     * Function: getLayerByName
     *
     * Returns the MapGuide layer object as identified by the layer name
     */
    getLayerByName : function(name)
    {
        var oLayer = null;
        for (var i=0; i<this.aLayers.length; i++)
        {
            if (this.aLayers[i].layerName == name)
            {
                oLayer = this.aLayers[i];
                break;
            }
        }
        return oLayer;
    },

    /**
     * Function: getLayerById
     *
     * Returns the MapGuide layer object as identified by the layer unique id
     */
    getLayerById : function(id)
    {
        var oLayer = null;
        for (var i=0; i<this.aLayers.length; i++)
        {
            if (this.aLayers[i].uniqueId == id)
            {
                oLayer = this.aLayers[i];
                break;
            }
        }
        return oLayer;
    },

    getSelectionCB: function(userFunc, r) {
      if (r.status == 200) {
          var o;
          eval("o="+r.responseText);
          var oSelection = new Fusion.SelectionObject(o);
          userFunc(oSelection);
      }
    },

    /**
     * advertise a new selection is available
     */
    newSelection: function() {
        if (this.oSelection) {
            this.oSelection = null;
        }
        this.bSelectionOn = true;
        this.triggerEvent(Fusion.Event.MAP_SELECTION_ON);
    },

    /**
     * Returns the number of features selected for this map layer
     */
    getSelectedFeatureCount: function() {
      var total = 0;
      for (var j=0; j<this.aLayers.length; ++j) {
        total += this.aLayers[j].selectedFeatureCount;
      }
      return total;
    },

    /**
     * Returns the number of features selected for this map layer
     */
    getSelectedLayers: function() {
      var layers = [];
      for (var j=0; j<this.aLayers.length; ++j) {
        if (this.aLayers[j].selectedFeatureCount>0) {
          layers.push(this.aLayers[j]);
        }
      }
      return layers;
    },

    /**
     * Returns the number of features selected for this map layer
     */
    getSelectableLayers: function() {
      var layers = [];
      for (var j=0; j<this.aLayers.length; ++j) {
        if (this.aLayers[j].selectable) {
          layers.push(this.aLayers[j]);
        }
      }
      return layers;
    },

    /**
     * Updates the current map selection with the provided XML selection string.
     * Optionally zooms to the new selection on the map, if zoomTo is set to true.
     */
    setSelection: function (selText, zoomTo) {

        //TODO Update this.previousSelection when the selection is set using
        //this API to allow the selection to be extended with a shift-click.

        if(selText != "" && selText != null) {
            this.updateSelection(selText, zoomTo, false);
        }
        else {
            this.clearSelection();
        }
    },

    updateSelection: function (selText, zoomTo, extendSelection) {
        this.updateMapSelection(selText, zoomTo);
        this.getSelectedFeatureProperties(selText);
    },


    getSelectedFeatureProperties: function (selText) {
      this.mapWidget._addWorker();
      var sl = Fusion.getScriptLanguage();
      var getPropertiesScript = 'layers/' + this.arch + '/' + sl  + '/GetSelectionProperties.' + sl;
      var params = {
          'mapname': this.getMapName(),
          'session': this.getSessionID(),
          'selection': selText,
          'seq': Math.random()
      };
      var options = {onSuccess: OpenLayers.Function.bind(this.processSelectedFeatureProperties, this),
                     parameters:params};
      Fusion.ajaxRequest(getPropertiesScript, options);
    },

    updateMapSelection: function (selText, zoomTo) {
      this.mapWidget._addWorker();
      var sl = Fusion.getScriptLanguage();
      var updateSelectionScript = 'layers/' + this.arch + '/' + sl  + '/SaveSelection.' + sl;
      var params = {
          'mapname': this.getMapName(),
          'session': this.getSessionID(),
          'selection': selText,
          'seq': Math.random(),
          'getextents' : zoomTo ? 'true' : 'false'
      };
      var options = {onSuccess: OpenLayers.Function.bind(this.renderSelection, this, zoomTo),
                     parameters:params};
      Fusion.ajaxRequest(updateSelectionScript, options);
    },



     /**
     * asynchronously load the current selection.  When the current
     * selection changes, the selection is not loaded because it
     * could be a lengthy process.  The user-supplied function will
     * be called when the selection is available.
     *
     * @param userFunc {Function} a function to call when the
     *        selection has loaded
     *
     * @param layers {string} Optional parameter.  A comma separated
     *        list of layer names (Roads,Parcels). If it is not
     *        given, all the layers that have a selection will be used
     *
     * @param startcount {string} Optional parameter.  A comma separated
     *        list of a statinh index and the number of features to be retured for
     *        each layer given in the layers parameter. Index starts at 0
     *        (eg: 0:4,2:6 : return 4 elements for the first layers starting at index 0 and
     *         six elements for layer 2 starting at index 6). If it is not
     *        given, all the elemsnts will be returned.
     */
    getSelection: function(userFunc, layers, startcount) {

      /*for now always go back to server to fetch selection */

      if (userFunc)
      {
          //this.aSelectionCallbacks.push(userFunc);


          //this.mapWidget._addWorker();
          // this._bSelectionIsLoading = true;
          var s = 'layers/' + this.arch + '/' + Fusion.getScriptLanguage() + "/Selection." + Fusion.getScriptLanguage() ;
          var options = {
              parameters: {'session': this.getSessionID(),
                          'mapname': this._sMapname,
                          'layers': layers,
                          'startcount': startcount},
              onSuccess: OpenLayers.Function.bind(this.getSelectionCB, this, userFunc)
          };
          Fusion.ajaxRequest(s, options);
      }
    },

    /**
       Call back function when selection is cleared
    */
    selectionCleared: function()
    {
        //clear the selection count for the layers
        for (var j=0; j<this.aLayers.length; ++j) {
          this.aLayers[j].selectedFeatureCount = 0;
        }

        this.bSelectionOn = false;
        if (this.queryLayer) {
          this.queryLayer.setVisibility(false);
        }
        this.triggerEvent(Fusion.Event.MAP_SELECTION_OFF);
        this.drawMap();
        this.oSelection = null;
    },

    /**
       Utility function to clear current selection
    */
    clearSelection: function() {
      if (this.hasSelection()) {
          var s = 'layers/' + this.arch + '/' + Fusion.getScriptLanguage() + "/ClearSelection." + Fusion.getScriptLanguage() ;
          var options = {
              parameters: {'session': this.getSessionID(),
                          'mapname': this._sMapname},
              onSuccess: OpenLayers.Function.bind(this.selectionCleared, this)
          };
          Fusion.ajaxRequest(s, options);
      }
      if (this.previousSelection != null)
      {
          this.previousSelection.clear();
      }
    },

    /**
       removes the queryLayer from the map
    */
    removeQueryLayer: function() {
      if (this.queryLayer) {
        this.queryLayer.destroy();
        this.queryLayer = null;
      }
    },

    /**
       Call back function when select functions are called (eg queryRect)
    */
    processQueryResults: function(zoomTo, r) {
        this.renderSelection(zoomTo, r);
        this.processSelectedFeatureProperties(r);
    },

    /**
       Call back function when select functions are called (eg queryRect)
       to handle feature attributes
    */
    processSelectedFeatureProperties: function(r) {
        this.mapWidget._removeWorker();
        if (r.responseText) {   //TODO: make the equivalent change to MapServer.js
            var oNode;
            eval('oNode='+r.responseText);

            if (oNode.hasSelection) {
              this.newSelection();
            } else {
              this.clearSelection();
              return;
            }
        }
    },

    /**
       Call back function when select functions are called (eg queryRect)
       to render the selection
    */
    renderSelection: function(zoomTo, r) {
        this.mapWidget._removeWorker();
        if (r.responseText) {   //TODO: make the equivalent change to MapServer.js
            var oNode;
            eval('oNode='+r.responseText);

            if (oNode.hasSelection) {
              if (this.selectionAsOverlay) {
                if (!this.queryLayer) {
                  this.queryLayer = this.createOLLayer("query layer", true, 5, true);
                  this.queryLayer.alwaysInRange = true;
                  this.mapWidget.oMapOL.addLayer(this.queryLayer);
                  this.mapWidget.registerForEvent(Fusion.Event.MAP_LOADING,
                        OpenLayers.Function.bind(this.removeQueryLayer, this));
                } else {
                  this.queryLayer.setVisibility(true);
                }
              }

              //Fix Ticket #1145.
              //When the user invokes the setSelection() function to update the selection,
              //clear the selection count for all layers before proceeding
              for (var j=0; j<this.aLayers.length; ++j) {
                this.aLayers[j].selectedFeatureCount = 0;
              }

              // set the feature count on each layer making up this map
              for (var i=0; i<oNode.layers.length; ++i) {
                var layerName = oNode.layers[i];
                for (var j=0; j<this.aLayers.length; ++j) {
                  if (layerName == this.aLayers[j].layerName) {
                    this.aLayers[j].selectedFeatureCount = oNode[layerName].featureCount;
                  }
                }
              }

              if (zoomTo) {
                var ext = oNode.extents;
                var extents = new OpenLayers.Bounds(ext.minx, ext.miny, ext.maxx, ext.maxy);
                this.mapWidget.setExtents(extents);
              }
              this.drawSelection();
            } else {
              this.clearSelection();
              return;
            }
        }
    },

    /**
       Do a query on the map
    */
    query: function(options) {
        this.mapWidget._addWorker();

        //clear the selection count for the layers
        for (var j=0; j<this.aLayers.length; ++j) {
          this.aLayers[j].selectedFeatureCount = 0;
        }

        var persist = 1;
        var layerAttributeFilter = 3;
        var maxFeatures = options.maxFeatures;
        if(maxFeatures == null || maxFeatures == 0)
        {
            maxFeatures = -1;
        }
        var r = new Fusion.Lib.MGRequest.MGQueryMapFeatures(this.getSessionID(),
                                                                this._sMapname,
                                                                options.geometry,
                                                                maxFeatures,
                                                                persist,
                                                                options.selectionType || this.selectionType,
                                                                options.layers,
                                                                layerAttributeFilter);
        
        //If user callback specified, add it to the tail end of the query completed callback
        var callback = null;
        if (typeof(options.callback) == 'function') {
            if (options.extendSelection == true) {
                callback = OpenLayers.Function.bind(function() { 
                    this.processAndMergeFeatureInfo.apply(this, arguments);
                    options.callback.apply(this, arguments);
                }, this);
            } else {
                callback = OpenLayers.Function.bind(function() { 
                    this.processFeatureInfo.apply(this, arguments);
                    options.callback.apply(this, arguments);
                }, this);
            }
        } else {
            callback = (options.extendSelection == true) ? OpenLayers.Function.bind(this.processAndMergeFeatureInfo, this) : OpenLayers.Function.bind(this.processFeatureInfo, this);
        }
        Fusion.oBroker.dispatchRequest(r, OpenLayers.Function.bind(Fusion.xml2json, this, callback));
    },

    showLayer: function( layer, noDraw ) {
        this.processLayerEvents(layer, true);
        this.aShowLayers.push(layer.uniqueId);
        if (!noDraw) {
            this.drawMap();
        }
    },

    hideLayer: function( layer, noDraw ) {
        this.processLayerEvents(layer, false);
        this.aHideLayers.push(layer.uniqueId);
        if (!noDraw) {
            this.drawMap();
        }
    },

    showGroup: function( group, noDraw ) {
        this.processGroupEvents(group, true);
        if (group.groupName == 'layerRoot') {
            this.oLayerOL.setVisibility(true);
            if (this.oLayerOL2) this.oLayerOL2.setVisibility(true);
        } else if (group.isBaseMapGroup) {
            this.oLayerOL.setVisibility(true);
        } else {
            this.aShowGroups.push(group.uniqueId);
            if (!noDraw) {
                this.drawMap();
            }
        }
    },
    hideGroup: function( group, noDraw ) {
        this.processGroupEvents(group, false);
        if (group.groupName == 'layerRoot') {
            this.oLayerOL.setVisibility(false);
            if (this.oLayerOL2) this.oLayerOL2.setVisibility(false);
        } else if (group.isBaseMapGroup) {
            this.oLayerOL.setVisibility(false);
        } else {
            this.aHideGroups.push(group.uniqueId);
            if (!noDraw) {
                this.drawMap();
            }
        }
    },
    refreshLayer: function( layer ) {
        this.aRefreshLayers.push(layer.uniqueId);
        this.drawMap();
    },

  /**
     * called when there is a click on the map holding the CTRL key: query features at that postion.
     **/
    mouseUpCRTLClick: function(evt) {
      if (evt.ctrlKey) {
        var min = this.mapWidget.pixToGeo(evt.xy.x-this.nTolerance, evt.xy.y-this.nTolerance);
        var max = this.mapWidget.pixToGeo(evt.xy.x+this.nTolerance, evt.xy.y+this.nTolerance);
        if (!min) {
          return;
        }
        var sGeometry = 'POLYGON(('+ min.x + ' ' +  min.y + ', ' +  min.x + ' ' +  max.y + ', ' + max.x + ' ' +  max.y + ', ' + max.x + ' ' +  min.y + ', ' + min.x + ' ' +  min.y + '))';
        //var sGeometry = 'POINT('+ min.x + ' ' +  min.y + ')';

        var maxFeatures = 1;
        var persist = 0;
        var selection = 'INTERSECTS';
        var layerNames = '';
        var layerAttributeFilter = 3;
        var sep = '';
        for (var i=0; i<this.aLayers.length; ++i) {
          layerNames += sep + this.aLayers[i].layerName;
          sep = ',';
        }
        var r = new Fusion.Lib.MGRequest.MGQueryMapFeatures(this.mapWidget.getSessionID(),
                                                            this._sMapname,
                                                            sGeometry,
                                                            maxFeatures, persist, selection, layerNames,
                                                            layerAttributeFilter);
        var callback = OpenLayers.Function.bind(this.crtlClickDisplay, this);
        Fusion.oBroker.dispatchRequest(r, OpenLayers.Function.bind(Fusion.xml2json, this, callback));
      }
    },

    /**
     * open a window if a URL is defined for the feature.
     **/
    crtlClickDisplay: function(xhr) {
        //console.log('ctrlclcik  _display');
        if (xhr.status == 200) {
            var o;
            eval('o='+xhr.responseText);
            var h = o['FeatureInformation']['Hyperlink'];
            if (h) {
                window.open(h[0], "");
            }
        }
    },

    //GETVISIBLEMAPEXTENT must be called for tiled maps whenever the extents
    //are changed so that tooltips will work properly
    mapExtentsChanged: function() {
      if (!this.singleTile) {
          var center = this.mapWidget.oMapOL.getCenter();
          var display = this.mapWidget.oMapOL.getSize();
          var r = new Fusion.Lib.MGRequest.MGGetVisibleMapExtent(this.mapWidget.getSessionID(),
                                                              this._sMapname,
                                                              center.lon, center.lat,
                                                              this.mapWidget.oMapOL.getScale(),
                                                              null,
                                                              this._nDpi,
                                                              display.w, display.h);
          Fusion.oBroker.dispatchRequest(r);
      }
    },

    pingServer: function() {
        var s = 'layers/' + this.arch + '/' + Fusion.getScriptLanguage() + "/Common." + Fusion.getScriptLanguage() ;
        var params = {onSuccess: OpenLayers.Function.bind(this.checkPingResponse, this)};
        params.parameters = {'session': this.getSessionID()};
        Fusion.ajaxRequest(s, params);
    },
    
    checkPingResponse: function(xhr) {
      if (xhr.responseText) {
        var o;
        eval("o="+xhr.responseText);
        if (!o.success) {
          Fusion.reportError(o.message);
          clearInterval(this.keepAliveTimer);
        }
      }
    },

    getLinkParams: function() {
      var queryParams = {};
      queryParams.theme = this.sMapResourceId;

      //determine which layers have been toggled
      var showLayers = [];
      var hideLayers = [];
      for (var i=0; i<this.aLayers.length; ++i) {
        var layer = this.aLayers[i];
        if (layer.visible && !layer.initiallyVisible) {  //layer was turned on
          showLayers.push(layer.layerName);
        }
        if (!layer.visible && layer.initiallyVisible) {  //layer was turned off
          hideLayers.push(layer.layerName);
        }
      }
      queryParams.showlayers = showLayers.join(',');
      queryParams.hidelayers = hideLayers.join(',');

      //determine which groups have been toggled
      var showGroups = [];
      var hideGroups = [];
      for (var i=0; i<this.layerRoot.groups.length; ++i) {
        var group = this.layerRoot.groups[i];
        if (group.visible && !group.initiallyVisible) {  //layer was turned on
          showGroups.push(group.groupName);
        }
        if (!group.visible && group.initiallyVisible) {  //layer was turned off
          hideGroups.push(group.groupName);
        }
      }
      queryParams.showgroups = showGroups.join(',');
      queryParams.hidegroups = hideGroups.join(',');

      return queryParams;
    },
    
    getMapTip: function(mapTipWidget) {
      //console.log('showMaptip');
        var oBroker = Fusion.oBroker;
        var x = mapTipWidget.oCurrentPosition.x;
        var y = mapTipWidget.oCurrentPosition.y;
        var min = this.mapWidget.pixToGeo(x-mapTipWidget.nTolerance, y-mapTipWidget.nTolerance);
        var max = this.mapWidget.pixToGeo(x+mapTipWidget.nTolerance, y+mapTipWidget.nTolerance);
        //this can fail if no map is loaded
        if (!min) {
            return;
        }
        var sGeometry = 'POLYGON(('+ min.x + ' ' +  min.y + ', ' +  min.x + ' ' +  max.y + ', ' + max.x + ' ' +  max.y + ', ' + max.x + ' ' +  min.y + ', ' + min.x + ' ' +  min.y + '))';

        //var sGeometry = 'POINT('+ min.x + ' ' +  min.y + ')';

        var maxFeatures = 1;
        var persist = 0;
        var selection = 'INTERSECTS';
        // only select visible layers with maptips defined (1+4)
        var layerAttributeFilter = 5;
        //TODO: possibly make the layer names configurable?
        var layerNames = mapTipWidget.aLayers.toString();
        var r = new Fusion.Lib.MGRequest.MGQueryMapFeatures(this.getSessionID(),
                                        this._sMapname,
                                        sGeometry,
                                        maxFeatures, persist, selection, layerNames,
                                        layerAttributeFilter);
        oBroker.dispatchRequest(r, 
            OpenLayers.Function.bind(Fusion.xml2json, this, 
                  OpenLayers.Function.bind(this.parseMapTip, this)));
    },
    
    parseMapTip: function(xhr) {
        var o;
        eval("tooltip="+xhr.responseText);
        this.oMaptip = {t:"",h:""};
        var t = tooltip['FeatureInformation']['Tooltip'];
        if (t) {
          this.oMaptip.t = t[0].replace(/\\n/g, "<br>");
        }
        var h = tooltip['FeatureInformation']['Hyperlink'];
        if (h) {
          this.oMaptip.h = h[0];
        }
        this.mapWidget.triggerEvent(Fusion.Event.MAP_MAPTIP_REQ_FINISHED, this.oMaptip);
    },
    
    getLegendImageURL: function(fScale, layer, style,defaultIcon) {
        if(layer.layerTypes[0] == 4){
            return defaultIcon;
        }
        else
        {
            if (style.iconOpt && style.iconOpt.url)
                return style.iconOpt.url;
        
            var origUrl = Fusion.getConfigurationItem('mapguide', 'mapAgentUrl');
            var altUrl = null;
            
            if (this.oLayerOL && this.oLayerOL.alternateUrls && this.oLayerOL.alternateUrls.length > 0) {
                altUrl = this.oLayerOL.getNextAltURL();
            }
            
            var url = (altUrl == null) ? origUrl : altUrl;
            
            url += "?OPERATION=GETLEGENDIMAGE&SESSION=" + layer.oMap.getSessionID();
            url += "&VERSION=1.0.0&SCALE=" + fScale;
            op = /\(/g; cp = /\)/g; 
            url += "&LAYERDEFINITION=" + encodeURIComponent(layer.resourceId).replace(op, "%28").replace(cp, "%29");
            url += "&THEMECATEGORY=" + style.categoryIndex;
            url += "&TYPE=" + style.geometryType;
            url += "&CLIENTAGENT=" + encodeURIComponent(this.clientAgent);
            if (this.noCache) {
                url += "&TS=" + (new Date()).getTime();
            }
            return url;
        }

    },


    processAndMergeFeatureInfo: function (r) {
        this.processSelectedFeatureInfo(r, true);
    },

    processFeatureInfo: function (r) {
        this.processSelectedFeatureInfo(r, false);
    },

    processSelectedFeatureInfo: function (r, mergeSelection) {
        eval('o='+r.responseText);

        var newSelection = new Fusion.SimpleSelectionObject(o);
        if(mergeSelection == true)
        {
            newSelection.merge(this.previousSelection);
        }
        this.previousSelection = newSelection;

        var selText = newSelection.getSelectionXml();
        this.setSelection(selText, false);
        this.mapWidget._removeWorker();
    }

});

Fusion.SimpleSelectionObject = OpenLayers.Class({
    aLayers : null,
    nLayers : 0,

    initialize: function(featureInfoResponse)
    {
        this.aLayers = [];
        this.nLayers = 0;
        try
        {
            var layers = featureInfoResponse.FeatureInformation.FeatureSet[0].Layer;
            if (layers != null)
            {
                for(var i = 0; i < layers.length; i++)
                {
                    var layerId = o['FeatureInformation']['FeatureSet'][0]['Layer'][i]['@id'][0];

                    var classElt = o['FeatureInformation']['FeatureSet'][0]['Layer'][i]['Class'][0];
                    var className = o['FeatureInformation']['FeatureSet'][0]['Layer'][i]['Class'][0]['@id'][0];

                    var layer = new Fusion.SimpleSelectionObject.Layer(layerId, className);

                    this.addLayer(layer);

                    var features = classElt.ID;
                    for(var j=0; j < features.length; j++)
                    {
                        layer.addFeature(features[j]);
                    }
                }
            }
        }
        catch(e) {}

    },

    addLayer: function(layer)
    {
        this.aLayers[this.nLayers] = layer;
        this.nLayers++;
    },

    getNumLayers : function()
    {
        return this.nLayers;
    },

    getLayerByName : function(name)
    {
        var oLayer = null;
        for (var i=0; i<this.nLayers; i++)
        {
            if (this.aLayers[i].getName() == name)
            {
                oLayer = this.aLayers[i];
                break;
            }
        }
        return oLayer;
    },

    getLayer : function(iIndice)
    {
        if (iIndice >=0 && iIndice < this.nLayers)
        {
            return this.aLayers[iIndice];
        }
        else
        {
            return null;
        }
    },

    getSelectionXml : function()
    {
        var xmlSelection = "";
        if(this.nLayers > 0)
        {
            xmlSelection = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<FeatureSet>\n";
            for(var i = 0; i < this.nLayers; i++)
            {
                var layer = this.aLayers[i];
                xmlSelection += "<Layer id=\"" + layer.getName() + "\">\n";
                xmlSelection += "<Class id=\"" + layer.getClassName() + "\">\n";
                for(var j = 0; j < layer.getNumFeatures(); j++)
                {
                    var featId = layer.featIds[j];
                    xmlSelection += "<ID>" +  featId + "</ID>\n";
                }
                xmlSelection += "</Class>\n</Layer>\n";
            }
            xmlSelection += "</FeatureSet>\n";
        }
        return xmlSelection;
    },

    merge : function(previousSelection)
    {
        if (previousSelection != null && previousSelection.nLayers > 0)
        {
            for (var prevSelIndex = 0; prevSelIndex < previousSelection.nLayers; prevSelIndex++)
            {
                var prevSelLayer = previousSelection.aLayers[prevSelIndex];

                // find the previously selected layer name in the current selection
                var currentLayer = this.getLayerByName(prevSelLayer.getName());
                if (currentLayer != null)
                {
                    // add the previously selected features for this layer
                    for (var j = 0; j < prevSelLayer.getNumFeatures(); j++)
                    {
                        var prevSelFeatureIndexes = currentLayer.featIds.find(prevSelLayer.featIds[j]);
                        if (prevSelFeatureIndexes == null)
                        {
                            currentLayer.addFeature(prevSelLayer.featIds[j]);
                        }
                        else
                        {
                            // the feature was previously selected, so toggle it off when selected again
                            currentLayer.removeFeatures(prevSelFeatureIndexes);
                        }
                    }
                    if (currentLayer.featIds.length == 0)
                    {
                        this.clear();
                    }
                }
                else
                {
                    // the current selection does not include this previously selected layer

                    // need to add this previously selected layer and its features
                    var missingLayer = new Fusion.SimpleSelectionObject.Layer(prevSelLayer.getName(), prevSelLayer.getClassName());
                    for (var k = 0; k < prevSelLayer.getNumFeatures(); k++)
                    {
                        missingLayer.addFeature(prevSelLayer.featIds[k]);
                    }
                    this.addLayer(missingLayer);
                }
            }
        }
    },

    clear: function()
    {
        this.aLayers = [];
        this.nLayers = 0;
    }
});

Fusion.SimpleSelectionObject.Layer = OpenLayers.Class({
    name: "",
    className: "",
    featIds: null,
    nFeatures: 0,

    initialize: function(layerName, className)
    {
        this.name =  layerName;
        this.className = className;
        this.nFeatures = 0;
        this.featIds =  [];
    },

    addFeature : function (featId)
    {
        this.featIds[this.nFeatures] = featId;
        this.nFeatures++;
    },

    getName : function()
    {
        return this.name;
    },

    getClassName : function()
    {
        return this.className;
    },

    getNumFeatures : function()
    {
        return this.nFeatures;
    },

    removeFeatures : function (featureIndexes)
    {
        var numIndexes = featureIndexes.length;
        for (var featIndex = 0; featIndex < numIndexes; featIndex++)
        {
            this.featIds.remove(featureIndexes[featIndex]);
            this.nFeatures--;
        }
    }
});

Array.prototype.find = function(searchStr) {
  var returnArray = null;
  for (i=0; i<this.length; i++) {
    if (typeof(searchStr) == 'function') {
      if (searchStr.test(this[i])) {
        if (!returnArray) { returnArray = [] }
        returnArray.push(i);
      }
    } else {
      if (this[i]===searchStr) {
        if (!returnArray) { returnArray = [] }
        returnArray.push(i);
      }
    }
  }
  return returnArray;
};

Array.prototype.remove = function(indexToRemove) {
    this.splice(indexToRemove, 1);
};




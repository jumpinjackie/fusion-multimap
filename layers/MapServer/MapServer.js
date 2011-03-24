/**
 * Fusion.Layers.MapServer
 *
 * $Id: MapServer.js 2262 2010-10-26 19:44:21Z madair $
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

/******************************************************************************
 * Class: Fusion.Layers.MapServer
 *
 * Implementation of the map widget for MapServer CGI interface services
*/
Fusion.Event.MAP_LAYER_ORDER_CHANGED = Fusion.Event.lastEventId++;

Fusion.Layers.MapServer = OpenLayers.Class(Fusion.Layers, {
    arch: 'MapServer',
    session: [null],
    sActiveLayer: null,
    selectionType: 'INTERSECTS',
    bSelectionOn: false,
    oSelection: null,
    bLayersReversed: true,     //MS returns layers bottom-most layer first, we treat layer order in reverse sense
    mapMetadataKeys: null,
    layerMetadataKeys: null,
    oMaptip:null,
    bMapTipFired: false,
    bRestoreMapState: false,
    oRestoredState: {},

    //the map file
    sMapFile: null,

    initialize: function(map, mapTag, isMapWidgetLayer) {
        //console.log('Fusion.Layers.MapServer.initialize');
        Fusion.Layers.prototype.initialize.apply(this, arguments);
        this.registerEventID(Fusion.Event.MAP_SESSION_CREATED);
        //this.selectionType = extension.SelectionType ? extension.SelectionType[0] : 'INTERSECTS';

        this.sMapFile = mapTag.extension.MapFile ? mapTag.extension.MapFile[0] : '';

        // load mapfrom the querystring if "theme" is present.
        var newTheme = Fusion.getQueryParam('theme');
        if (newTheme != '') {
        this.sMapFile = newTheme;
          //clear the query param after it has been used once
          Fusion.queryParams['theme'] = null;
        }

        var restoreMapState = Fusion.getQueryParam('restoreState');
        if (restoreMapState != '') {
          //clear the query param after it has been used once
          this.oRestoredState.id = restoreMapState;
          Fusion.queryParams['restoreState'] = null;
          // set flag to true so we can restore the map from a saved session.
          this.bRestoreMapState = true;
        }
        

        this.mapMetadataKeys = mapTag.extension.MapMetadata ? mapTag.extension.MapMetadata[0] : null;
        this.layerMetadataKeys = mapTag.extension.LayerMetadata ? mapTag.extension.LayerMetadata[0] : null;
        
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

        if (mapTag.sid) {
            this.session[0] = mapTag.sid;
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
            Fusion.ajaxRequest(scriptURL,options);
        }
        if (this.session[0] instanceof Fusion.Layers.MapServer) {
            this.session[0].registerForEvent(Fusion.Event.MAP_SESSION_CREATED, 
                        OpenLayers.Function.bind(this.mapSessionCreated, this));
        } else {
            this.mapSessionCreated();
        }
    },

    createSessionCB: function(r) {
        if (r.status == 200) {
            var o;
            eval('o='+r.responseText);
            this.session[0] = o.sessionId;
            var acceptLang = o.acceptLanguage.split(',');
            //IE - en-ca,en-us;q=0.8,fr;q=0.5,fr-ca;q=0.3
            //FF - en-us,en;q=0.5
            for (var i=0; i<acceptLang.length; ++i) {
              var locale = acceptLang[i].split(";");
              Fusion.initializeLocale(locale[0]);
              break;
            }

            /* Session is created, Check to see if we are going to restore a saved
                map state and restore it if set to true.
            */
            if(this.bRestoreMapState == true){
                var that = this;
                var sl = Fusion.getScriptLanguage();
                var scriptURL = 'layers/' + this.arch + '/' + sl + '/RestoreState.' + sl;

                var params = {
                    parameters: OpenLayers.Util.getParameterString({
                        session: this.session[0] ,
                        id: this.oRestoredState.id
                    }),
                    onComplete: function(xhr) {
                        var o;
                        eval('o='+xhr.responseText);
                        that.restoreStateCB(o);
                    }
                };
                Fusion.ajaxRequest(scriptURL,params);
            }
            else
            {
                // done with session create, fire the event.
                this.triggerEvent(Fusion.Event.MAP_SESSION_CREATED);
            }
            
        }
    },

    restoreStateCB: function(oResponse){
        if(oResponse.error){
            Fusion.reportError(new Fusion.Error(Fusion.Error.WARNING, "Error Restoring Map State - "+oResponse.error));
        }
        else
        {
        this.oRestoredState = oResponse;
        }
        // done with session create, fire the event.
        this.triggerEvent(Fusion.Event.MAP_SESSION_CREATED);
    },

    mapSessionCreated: function() {
        // restore the mapfile from a saved state.
        if (this.bRestoreMapState === true && this.oRestoredState.loadmap ) {
            this.loadMap(this.oRestoredState.loadmap);
        } else if (this.sMapFile != '') {
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
          this.loadMap(this.sMapFile, options);
        }
        window.setInterval(OpenLayers.Function.bind(this.pingServer, this), 
                                                this.keepAliveInterval * 1000);
    },

    sessionReady: function() {
        return (typeof this.session[0] == 'string');
    },

    getSessionID: function() {
        return this.session[0];
    },

    loadMap: function(mapfile, options) {
        while (this.mapWidget.isBusy()) {
	        this.mapWidget._removeWorker();
        }
        this.bMapLoaded = false;
        //console.log('loadMap: ' + resourceId);
        /* don't do anything if the map is already loaded? */
        if (this._sMapFile == mapfile) {
            return;
        }

        if (!this.sessionReady()) {
            this.sMapFile = mapfile;
            return;
        }
        this.triggerEvent(Fusion.Event.LAYER_LOADING);
        this.mapWidget._addWorker();

        this._fScale = -1;
        this._nDpi = 72;

        options = options || {};

        this.aShowLayers = options.showlayers || [];
        this.aHideLayers = options.hidelayers || [];
        this.aShowGroups = options.showgroups || [];
        this.aHideGroups = options.showgroups || [];
        this.aVisibleLayers = [];
        this.aLayers = [];

        this.oSelection = null;
        this.aSelectionCallbacks = [];
        this._bSelectionIsLoading = false;

        var sl = Fusion.getScriptLanguage();
        var loadmapScript = 'layers/' + this.arch + '/' + sl  + '/LoadMap.' + sl;
        var params = {
            'mapfile': mapfile,
            'session': this.getSessionID()
        };
        if (this.mapMetadataKeys) {
            params.map_metadata = this.mapMetadataKeys;
        }
        if (this.layerMetadataKeys) {
            params.layer_metadata = this.layerMetadataKeys;
        }
        var options = {onSuccess:OpenLayers.Function.bind(this.mapLoaded, this), parameters: params};
        Fusion.ajaxRequest(loadmapScript, options);
    },

    mapLoaded: function(r) {
        if (r.status == 200)
        {
            var o;
            eval('o='+r.responseText);
            this._sMapFile = o.mapId;
            this._sMapname = o.mapName;
            this._sMapTitle = o.mapTitle;
            this._sImageType = o.imagetype;
            this.metadata = o.metadata;
            
            //setup the projection in the map widget
            if (o.projString.length > 0) {
              var epsg = o.projString.indexOf("init=");
              if (epsg >= 0) {
                this.mapTag.layerOptions.projection = o.projString.substring(epsg+5).toUpperCase();
              } else {
                this.mapTag.layerOptions.projection = o.mapName.toUpperCase();
                Proj4js.defs[this.mapTag.layerOptions.projection] = o.projString;
              }
            }

            this.mapTag.layerOptions.maxExtent = OpenLayers.Bounds.fromArray(o.extent);

            this.layerRoot.clear();
            this.layerRoot.legendLabel = this._sMapTitle;
            this.layerRoot.displayInLegend = true;
            this.layerRoot.expandInLegend = true;

            this.parseMapLayersAndGroups(o);

            var minScale = 1.0e10;
            var maxScale = 0;
            for (var i=0; i<this.aLayers.length; i++) {
              var testLayer = this.aLayers[i].layerName;
              if (this.aLayers[i].visible) {
                var layerName = testLayer;
                for (var j=0; j<this.aHideLayers.length; ++j) {
                  if (layerName == this.aHideLayers[j]) {
                    layerName = null;
                    this.aLayers[i].hide(true);
                    break;
                  }
                }
                if (layerName) this.aVisibleLayers.push(layerName);
              } else {
                var layerName = null;
                for (var j=0; j<this.aShowLayers.length; ++j) {
                  if (testLayer == this.aShowLayers[j]) {
                    layerName = testLayer;
                    this.aLayers[i].show(true);
                    break;
                  }
                }
                if (layerName) this.aVisibleLayers.push(layerName);
              }
      				minScale = Math.min(minScale, this.aLayers[i].minScale);
      				maxScale = Math.max(maxScale, this.aLayers[i].maxScale);
            }
            //a scale value of 0 is undefined
            if (minScale <= 0) {
              minScale = 1.0;
            }

            if (o.dpi) {
                OpenLayers.DOTS_PER_INCH = o.dpi;
            }

            //to allow for scaling that doesn't match any of the pre-canned units
            this.mapTag.layerOptions.units = Fusion.getClosestUnits(o.metersPerUnit);
            
            var layerOptions = {
      				singleTile: true,
      				ratio: this.ratio,
              maxResolution: 'auto',
      				minScale: maxScale,	//OL interpretation of min/max scale is reversed from Fusion
      				maxScale: minScale
      			};
            OpenLayers.Util.extend(layerOptions, this.mapTag.layerOptions);

            //create the OL layer for this Map layer
            var params = {
              layers: this.aVisibleLayers.join(' '),
              session: this.getSessionID(),
              map: this._sMapFile,
              map_imagetype: this._sImageType
            };
            OpenLayers.Util.extend(params, this.mapTag.layerParams);

            //remove this layer if it was already loaded
            if (this.oLayerOL) {
                this.oLayerOL.events.unregister("loadstart", this, this.loadStart);
                this.oLayerOL.events.unregister("loadend", this, this.loadEnd);
                this.oLayerOL.events.unregister("loadcancel", this, this.loadEnd);
                this.oLayerOL.destroy();
            }

            var url = Fusion.getConfigurationItem('mapserver', 'cgi');
            this.oLayerOL = new OpenLayers.Layer.MapServer( o.mapName, url, params, layerOptions);
            this.oLayerOL.events.register("loadstart", this, this.loadStart);
            this.oLayerOL.events.register("loadend", this, this.loadEnd);
            this.oLayerOL.events.register("loadcancel", this, this.loadEnd);

            if (this.bIsMapWidgetLayer) {
              this.mapWidget.addMap(this);
            }
            this.bMapLoaded = true;
        }
        else
        {
            Fusion.reportError( new Fusion.Error(Fusion.Error.FATAL,
					'Failed to load requested map:\n'+r.responseText));
        }
        this.mapWidget._removeWorker();
        this.triggerEvent(Fusion.Event.LAYER_LOADED);
    },

    reloadMap: function() {
        this.mapWidget._addWorker();
        this.aVisibleLayers = [];
        this.aVisibleGroups = [];
        this.layerRoot.clear();
        this.aLayers = [];

        var sl = Fusion.getScriptLanguage();
        var loadmapScript = 'layers/' + this.arch + '/' + sl  + '/LoadMap.' + sl;

        var params = {
            'mapname': this._sMapname,
            'session': this.getSessionID()
        };
        if (this.mapMetadataKeys) {
            params.map_metadata = this.mapMetadataKeys;
        }
        if (this.layerMetadataKeys) {
            params.layer_metadata = this.layerMetadataKeys;
        }
        var options = {onSuccess: OpenLayers.Function.bind(this.mapReloaded, this),
                                     parameters: params};
        Fusion.ajaxRequest(loadmapScript, options);
    },

    /**
     * Function: loadScaleRanges
     * 
     * This function should be called after the map has loaded. It
     * loads the scsle ranges for each layer. I tis for now only
     * used by the legend widget.
     */
        
    loadScaleRanges: function(userFunc) {
        var sl = Fusion.getScriptLanguage();
        var loadmapScript = 'layers/' + this.arch + '/' + sl  + '/LoadScaleRanges.' + sl;
        
        var sessionid = this.getSessionID();
        
        var params = {'mapname': this._sMapname, "session": this.getSessionID()};
        var options = {onSuccess: OpenLayers.Function.bind(this.scaleRangesLoaded,this, userFunc), 
                       parameters:params};
        Fusion.ajaxRequest(loadmapScript, options);
    },

    scaleRangesLoaded: function(userFunc, r) {
        if (r.status == 200) {
            var o;
            eval('o='+r.responseText);
            
            if (o.layers && o.layers.length > 0) {
                var iconOpt = {
                    url: o.icons_url || null,
                    width: o.icons_width || 16,
                    height: o.icons_height || 16
                };
                for (var i=0; i<o.layers.length; i++) {
                    var oLayer = this.getLayerById(o.layers[i].uniqueId);
                    if (oLayer) {
                        oLayer.scaleRanges = [];
                        for (var j=0; j<o.layers[i].scaleRanges.length; j++) {
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

    mapReloaded: function(r) {  
        if (r.status == 200) {
            var o;
            eval('o='+r.responseText);

            //can metadata change?
            //this.metadata = o.metadata;

            this.parseMapLayersAndGroups(o);
            this.aVisibleLayers = [];
            for (var i=0; i<this.aLayers.length; i++) {
                if (this.aLayers[i].visible) {
                    this.aVisibleLayers.push(this.aLayers[i].layerName);
                }
            }
            this.drawMap();
            this.mapWidget.triggerEvent(Fusion.Event.MAP_RELOADED);
        } else {
            Fusion.reportError( new Fusion.Error(Fusion.Error.FATAL,
                OpenLayers.i18n('mapLoadError', {'error':r.responseText})));
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
        var options = {onSuccess: OpenLayers.Function.bind(this.mapLayersReset, this, aLayerIndex),
                                     parameters: params};
        Fusion.ajaxRequest(loadmapScript, options);
    },

    mapLayersReset: function(aLayerIndex,r) {
        //console.log("mapLayersReset");
        var o;
        eval('o='+r.responseText);
        if (o.success) {
            var layerCopy = $A(this.aLayers);
            var nLayers = layerCopy.length -1;
            //Mapserver has list of layers reversed from MapGuide
            aLayerIndex.reverse();

            this.aLayers = [];
            this.aVisibleLayers = [];

            for (var i=0; i<aLayerIndex.length; ++i) {
                this.aLayers.push( layerCopy[aLayerIndex[i] ] );
                if (this.aLayers[i].visible) {
                    this.aVisibleLayers.push(this.aLayers[i].layerName);
                }
            }
            //this.layerRoot.clear();
            this.drawMap();
            this.triggerEvent(Fusion.Event.MAP_LAYER_ORDER_CHANGED);
        }

    },

    parseMapLayersAndGroups: function(o) {
        for (var i=0; i<o.groups.length; i++) {
            var group = new Fusion.Layers.Group(o.groups[i], this);
            var parent;
            if (group.parentUniqueId != '') {
                parent = this.layerRoot.findGroup(group.parentUniqueId);
            } else {
                parent = this.layerRoot;
            }
            parent.addGroup(group, this.bLayersReversed);
        }

        for (var i=0; i<o.layers.length; i++) {
            var layer = new Fusion.Layers.Layer(o.layers[i], this);
            var parent;
            if (layer.parentGroup != '') {
                parent = this.layerRoot.findGroup(layer.parentGroup);
            } else {
                parent = this.layerRoot;
            }
            parent.addLayer(layer, this.bLayersReversed);
            this.aLayers.push(layer);
        }
    },

    getScale: function() {
        return this.mapWidget.getScale();
    },

    updateLayer: function() {   //to be fleshed out, add query file to layer if selection, call this before draw
      if (this.hasSelection()) {
          this.oLayerOL.addOptions({queryfile: this._sQueryfile});
      }
    },

    drawMap: function() {
        if (!this.bMapLoaded || this.deferredDraw) {
            return;
        }
        var aLayers = [];
        for (var i=0; i<this.aLayers.length; i++) {
            var l = this.aLayers[i];
            if (l.isVisible()) {
                aLayers.push(l.layerName);
            }
        }
        var params = { layers: /*this.aVisibleLayers */aLayers.join(' '), ts : (new Date()).getTime()};
        if (this.hasSelection()) {
            params['queryfile']=this._sQueryfile;
        } else {
            params['queryfile'] = '';
        }
        this.oLayerOL.mergeNewParams(params);
    },

    showLayer: function( sLayer, noDraw ) {
        this.aVisibleLayers.push(sLayer.layerName);
        if (!noDraw) {
          this.drawMap();
        }
    },

    hideLayer: function( sLayer, noDraw ) {
        for (var i=0; i<this.aLayers.length; i++) {
            if (this.aVisibleLayers[i] == sLayer.layerName) {
                this.aVisibleLayers.splice(i,1);
                break;
            }
        }
        if (!noDraw) {
          this.drawMap();
        }
    },

    showGroup: function( group, noDraw ) {
        this.processGroupEvents(group, true);
        if (group.groupName == 'layerRoot') {
            this.oLayerOL.setVisibility(true);
        } else {
            this.aVisibleGroups.push(group.uniqueId);
            this.deferredDraw = true;
            for (var i=0; i<group.layers.length; ++i) {
              if (group.layers[i].wasVisibleInGroup) {
                group.layers[i].show();
              }
              group.layers[i].wasVisibleInGroup = null;
            }
            this.deferredDraw = false;
            this.drawMap();
        }
    },
    hideGroup: function( group, noDraw ) {
        this.processGroupEvents(group, false);
        if (group.groupName == 'layerRoot') {
            this.oLayerOL.setVisibility(false);
        } else {
            for (var i=0; i<this.aVisibleGroups.length; i++) {
                if (this.aVisibleGroups[i] == group.uniqueId) {
                    this.aVisibleGroups.splice(i,1);
                    break;
                }
            }
            this.deferredDraw = true;
            for (var i=0; i<group.layers.length; ++i) {
              if (group.layers[i].visible) {
                group.layers[i].wasVisibleInGroup = true;
                group.layers[i].hide();
              }
            }
            this.deferredDraw = false;
            this.drawMap();
        }
    },
    showGroupOLD: function( sGroup ) {
      if (sGroup == 'layerRoot') {
        this.oLayerOL.setVisibility(true);
      } else {
        this.aVisibleGroups.push(sGroup);
        var group = this.layerRoot.findGroup(sGroup);
        this.deferredDraw = true;
        for (var i=0; i<group.layers.length; ++i) {
          group.layers[i].show();
        }
        this.deferredDraw = false;
        this.drawMap();
      }
    },

    hideGroupOLD: function( sGroup ) {
      if (sGroup == 'layerRoot') {
        this.oLayerOL.setVisibility(false);
      } else {
        for (var i=0; i<this.aVisibleGroups.length; i++) {
            if (this.aVisibleGroups[i] == sGroup) {
                this.aVisibleGroups.splice(i,1);
                break;
            }
        }
        var group = this.layerRoot.findGroup(sGroup);
        this.deferredDraw = true;
        for (var i=0; i<group.layers.length; ++i) {
          group.layers[i].hide();
        }
        this.deferredDraw = false;
        this.drawMap();
      }
    },

    refreshLayer: function( sLayer ) {
        this.drawMap();
    },

    hasSelection: function() { return this.bSelectionOn; },

    getSelectionCB: function(userFunc, r) {
      if (r.status == 200) {
          var o;
          eval("o="+r.responseText);
          var oSelection = new Fusion.SelectionObject(o);
          userFunc(oSelection);
      }
    },

    /**
     * advertise a new selection is available and redraw the map
     */
    newSelection: function() {

        this.bSelectionOn = true;
        this.drawMap();
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
     * asynchronously load the current selection.  When the current
     * selection changes, the selection is not loaded because it
     * could be a lengthy process.  The user-supplied function will
     * be called when the selection is available.
     *
     * @param userFunc {Function} a function to call when the
     *        selection has loaded
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

        if (userFunc)
        {
            var s = 'layers/' + this.arch + '/' + Fusion.getScriptLanguage() + "/Selection." + Fusion.getScriptLanguage() ;
            var params = {
                'mapname': this._sMapname,
                'session': this.getSessionID(),
                'layers': layers,
                'startcount': startcount,
                'queryfile': this._sQueryfile
            };
            var options = {
                parameters:params,
                onSuccess: OpenLayers.Function.bind(this.getSelectionCB, this, userFunc)
            };
            Fusion.ajaxRequest(s, options);
        }

    },

    /**
       Utility function to clear current selection
    */
    clearSelection: function() {
      if (!this.aLayers) return;

        //clear the selection count for the layers
        for (var j=0; j<this.aLayers.length; ++j) {
          this.aLayers[j].selectedFeatureCount = 0;
        }

        this.bSelectionOn = false;
        this._sQueryfile = "";
        this.triggerEvent(Fusion.Event.MAP_SELECTION_OFF);
        this.drawMap();
        this.oSelection = null;
    },


    /**
       Call back function when slect functions are called (eg queryRect)
    */
    processQueryResults: function(zoomTo, r) {
        this.mapWidget._removeWorker();
        if (r.status == 200) {
            var o;
            eval("o="+r.responseText);
            if (!o.hasSelection) {
                //this.drawMap();
                return;
            } else {
                this._sQueryfile = o.queryFile;
                for (var i=0; i<o.layers.length; ++i) {
                  var layerName = o.layers[i];
                  for (var j=0; j<this.aLayers.length; ++j) {
                    if (layerName == this.aLayers[j].layerName) {
                      this.aLayers[j].selectedFeatureCount = o[layerName].featureCount;
                    }
                  }
                }
                this.newSelection();
                if (zoomTo) {
                var ext = oNode.extents;
                var extents = new OpenLayers.Bounds(ext.minx, ext.miny, ext.maxx, ext.maxy);
                this.zoomToSelection(extents);
              }
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

        var bPersistant = options.persistent || true;
        var layers = options.layers || '';
        /* if no layes are given, query only visible layers. This is ususally the most common case*/
        if (layers == '') {
          //layers = this.aVisibleLayers.join(',');
        }
        var zoomTo = options.zoomTo || false;
        var sl = Fusion.getScriptLanguage();
        var queryScript = 'layers/' + this.arch + '/' + sl  + '/Query.' + sl;

        var params = {
            'mapname': this._sMapname,
            'session': this.getSessionID(),
            'spatialfilter': options.geometry || '',
            'maxfeatures': options.maxFeatures || -1, //-1 means select all features
            'layers': layers,
            'variant': options.selectionType || this.selectionType
        };
        if (options.filter) {
            params.filter = options.filter;
        }
        if (options.extendSelection) {
            params.extendselection = true;
        }
        if (options.computedProperties) {
            params.computed = true;
        }
        var ajaxOptions = {
            onSuccess: OpenLayers.Function.bind(this.processQueryResults, this, zoomTo), 
            parameters: params
        };
        Fusion.ajaxRequest(queryScript, ajaxOptions);
    },

    pingServer: function() {
        var s = 'layers/' + this.arch + '/' + Fusion.getScriptLanguage() + "/Common." + Fusion.getScriptLanguage() ;
        var params = {};
        params.parameters = {'session': this.getSessionID()};
        Fusion.ajaxRequest(s, params);
  },

    getGroupInfoUrl: function(groupName) {
      return null;
   },

    getLayerInfoUrl: function(layerName) {
      return null;
  },

    getLayerById: function(id)
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

    getMetadata: function(key) {
        if (typeof this.metadata[key] != 'undefined') {
            return this.metadata[key];
        } else {
            return '';
        }
    },

    getLegendImageURL: function(fScale, layer, style,defaultIcon) {
        var sl = Fusion.getScriptLanguage();
        var url = Fusion.getFusionURL() + '/layers/' + this.arch + '/' + sl  + '/LegendIcon.' + sl;
        var sessionid = this.getSessionID();
        var params = 'mapname='+this._sMapname+"&session="+sessionid + '&layername='+layer.resourceId + '&classindex='+style.index;
        return url + '?'+params;
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
    
    getMapTip: function(oMapTips){
        if(this.bMapTipFired == false){
            //console.log("MAPSERVER:getMapTip");
            var pos = this.mapWidget.pixToGeo(oMapTips.oCurrentPosition.x, oMapTips.oCurrentPosition.y);
            var dfGeoTolerance = this.mapWidget.pixToGeoMeasure(oMapTips.nTolerance);
            var minx = pos.x-dfGeoTolerance;
            var miny = pos.y-dfGeoTolerance;
            var maxx = pos.x+dfGeoTolerance;
            var maxy = pos.y+dfGeoTolerance;
            var geometry = 'POLYGON(('+ minx + ' ' + miny + ', ' + minx + ' ' + maxy + ', ' + maxx + ' ' + maxy + ', ' + maxx + ' ' + miny + ', ' + minx + ' ' + miny + '))';
            var selectionType = "INTERSECTS";

           var aVisLayers = [];
           
           for(var i = 0; i<this.aLayers.length;i++ ){
                var iLayerMinScale = this.aLayers[i].scaleRanges[0].minScale;
                var iLayerMaxScale = this.aLayers[i].scaleRanges[0].maxScale;
                var iCurrentScale = this.mapWidget.getScale();

                if(iCurrentScale < iLayerMaxScale && iCurrentScale > iLayerMinScale){
                    if(this.aLayers[i].isVisible() === true){
                        aVisLayers.push(this.aLayers[i].layerName);
                    }
                }
           }

            var loadmapScript = '/layers/'+ this.arch + '/php/Maptip.php';
            var params = {
                'mapname': this._sMapname,
                'session': this.getSessionID(),
                'spatialfilter': geometry,
                'maxfeatures': 0, //zero means select all features
                'variant': selectionType,
                'layer': oMapTips.aLayers || '',
                'textfield': oMapTips.aTextFields || '',
                'label': oMapTips.aLabels || '',
                'customURL': oMapTips.aCustomURL || '',
                'visLayers' : aVisLayers
                
            }
            var parseMapTip = this.parseMapTip.bind(this);
            this.bMapTipFired = true;
            var ajaxOptions = {
                onSuccess: function(response){
                        eval("rjson=" + response.responseText);
                        parseMapTip(rjson);
                        },
                        parameters: params};
            Fusion.ajaxRequest(loadmapScript, ajaxOptions);
        }
    },
    
    parseMapTip: function(json){
        this.bMapTipFired = false;
        this.oMaptip = {};       
        this.oMaptip.t = json.maptips;
        this.oMaptip.h = json.url;
        // mapserver only
        this.oMaptip.l= json.label;
        
        this.mapWidget.triggerEvent(Fusion.Event.MAP_MAPTIP_REQ_FINISHED, this.oMaptip);
    }
});


var MSLAYER_POINT_TYPE = 0;
var MSLAYER_LINE_TYPE = 1;
var MSLAYER_POLYGON_TYPE = 2;
var MSLAYER_SOLID_TYPE = 3;
var MSLAYER_RASTER_TYPE = 4;



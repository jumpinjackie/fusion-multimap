/**
 * Fusion.Widget.OverviewMap
 *
 * $Id: OverviewMap.js 2139 2010-04-12 16:39:07Z chrisclaydon $
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

 /********************************************************************
 * Class: Fusion.Widget.OverviewMap
 *
 * A widget that displays an overview map showing the current view of the
 * primary map.
 * **********************************************************************/

Fusion.Widget.OverviewMap = OpenLayers.Class(Fusion.Widget, {
    oSize: null,
    nMinRatio: 4, // Default value
    nMaxRatio: 32, // Default value
    bDisplayed: false,

    initializeWidget: function(widgetTag) {
        var json = widgetTag.extension;
        if (json.MinRatio) {
            this.nMinRatio = json.MinRatio[0];
        }
        if (json.MaxRatio) {
            this.nMaxRatio = json.MaxRatio[0];
        }

        var mapTag = null;

        this.sMapGroupId = json.MapId;

        // Set the size to the size of the DOM element if available
        if (this.domObj) {
            this.domObj.style.overflow = 'hidden';
            var jxl = this.domObj.retrieve('jxLayout');
            if (!jxl) {
                jxl = new Jx.Layout(this.domObj);
            }
            jxl.addEvent('sizeChange', OpenLayers.Function.bind(this.sizeChanged, this));
        }

        this.oMapOptions = {};  //TODO: allow setting some mapOptions in AppDef

        this.getMap().registerForEvent(Fusion.Event.MAP_LOADED, OpenLayers.Function.bind(this.mapWidgetLoaded, this));
    },

    mapWidgetLoaded: function()
    {
        var mapTag = null;
        if (this.sMapGroupId)
        {
            // Use the specified map in the overview
            var mapGroup = Fusion.applicationDefinition.getMapGroup(this.sMapGroupId);
            mapTag = mapGroup.maps[0];    //TODO: always use the baselayer Map in the group?
        }
        else
        {
            // Use the same map as displayed in the main map widget in the overview
            var mainMap = this.getMap();
            mapTag = mainMap.mapGroup.maps[0];    //TODO: always use the baselayer Map in the group?
        }

        if (Fusion.Layers[mapTag.type])
        {
            // Create a Fusion layer of the specified type
            this.mapObject = new Fusion.Layers[mapTag.type](this.getMap(), mapTag, false);
        }
        else
        {
            // Create a generic Fusion layer (as used by Bing, Google, Yahoo etc.)
            this.mapObject = new Fusion.Layers.Generic(this, mapTag, false);
        }

        // Set up the binding so the display initializes when the map configuration has loaded
        this.mapObject.registerForEvent(Fusion.Event.LAYER_LOADED, OpenLayers.Function.bind(this.loadOverview, this));
    },

    loadOverview: function()
    {
        if (this.control) {
          this.control.destroy();
        }

        var layer = this.mapObject.oLayerOL;
        if(layer != null)
        {
            var size = $(this.domObj).getContentBoxSize();
            this.oSize = new OpenLayers.Size(size.width, size.height);
            layer.isBaseLayer = true;
            layer.ratio = 1.0;
            if (layer.singleTile) {
              this.oMapOptions.numZoomLevels = 3;  //TODO: make this configurable?
            }

            var options = {
              div: this.domObj,
              size: this.oSize,
              minRatio: this.nMinRatio,
              maxRatio: this.nMaxRatio,
              mapOptions: this.oMapOptions,
              layers: [layer]
            };

            this.control = new OpenLayers.Control.OverviewMap(options);
            if (size.width == 0 || size.height == 0)
            {
                return;   //don't try to load if the container is not visible
            }
            else
            {
                this.getMap().oMapOL.addControl(this.control);
                this.bDisplayed = true;
            }
            //console.log('OverviewMap mapLoaded');
        }
    },

    sizeChanged: function() {
        var size = $(this.domObj).getContentBoxSize();
        this.oSize = new OpenLayers.Size(size.width, size.height);
        if (size.width == 0 || size.height == 0) {
          return;   //don't try to load if the container is not visible
        }
        if (!this.bDisplayed && this.control) {
          this.getMap().oMapOL.addControl(this.control);
          this.bDisplayed = true;
        }
        if (this.control) {
            this.control.size = new OpenLayers.Size(size.width, size.height);
            this.control.mapDiv.style.width = this.oSize.w + 'px';
            this.control.mapDiv.style.height = this.oSize.h + 'px';
            this.control.ovmap.updateSize();
            this.control.update();
        }
    }

});


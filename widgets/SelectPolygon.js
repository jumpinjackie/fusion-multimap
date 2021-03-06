/**
 * Fusion.Widget.SelectPolygon
 *
 * $Id: SelectPolygon.js 2037 2010-01-14 20:00:51Z madair $
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
 * Class: Fusion.Widget.SelectPolygon
 *
 * perform a selection using a polygon
 * 
 * **********************************************************************/

Fusion.Widget.SelectPolygon = OpenLayers.Class(Fusion.Widget, {
    isExclusive: true,
    uiClass: Jx.Button,
    selectionType: 'INTERSECTS',
    nTolerance: 3, //default pixel tolernace for a point click
    activateDefaultWidgetOnCompletion: false, //If true, will activate the default widget upon completion
    
    initializeWidget: function(widgetTag) {
        this.asCursor = ['auto'];

        var json = widgetTag.extension;
        
        this.selectionType = json.SelectionType ? json.SelectionType[0] : 'INTERSECTS';
        if (json.Tolerance && (parseInt(json.Tolerance[0]) > 0)) {
            nTolerance = parseInt(json.Tolerance[0]);
        }
        this.bComputeMetadata = (json.ComputeMetadata &&
                           (json.ComputeMetadata[0] == 'true' ||
                            json.ComputeMetadata[0] == '1')) ? true : false;
                            
        this.activateDefaultWidgetOnCompletion = (json.ActivateDefaultWidgetOnCompletion &&
                           (json.ActivateDefaultWidgetOnCompletion[0] == 'true' ||
                            json.ActivateDefaultWidgetOnCompletion[0] == '1')) ? true : false;
        
        //add in the OL Polygon handler
        var mapWidget = this.getMap();
        this.map = mapWidget.oMapOL;
        this.handlerOptions = {};
        this.handler = new OpenLayers.Handler.Polygon(this, {done: this.execute}, this.handlerOptions);
        mapWidget.handlers.push(this.handler);
    },
    
    /**
     * activate the widget (listen to mouse events and change cursor)
     * This function should be defined for all functions that register
     * as a widget in the map
     */
    activate: function() {
        this.handler.activate();
        this.getMap().setCursor(this.asCursor);
        //this.getMap().supressContextMenu(true);
    },

    /**
     * deactivate the widget (listen to mouse events and change cursor)
     * This function should be defined for all functions that register
     * as a widget in the map
     **/
    deactivate: function()
    {
        this.handler.deactivate();
        this.getMap().setCursor('auto');
        //this.getMap().supressContextMenu(false);
    },
    
    /**
     *  
     **/
    execute: function(geom) {
        
        var options = {};
        options.geometry = geom.toString();
        options.selectionType = this.selectionType;
        options.computed = this.bComputeMetadata;
        
        if (this.handler.evt.ctrlKey) {
          options.extendSelection = true;
        }

        if (this.bActiveOnly) {
            var layer = this.getMap().getActiveLayer();
            if (layer) {
                options.layers = layer.layerName;
            } else {
                return;
            }
        }
        
        this.getMap().query(options);
        if (this.activateDefaultWidgetOnCompletion && this.getMap().activateDefaultWidget())
            this.deactivate();
    },
    
    setParameter: function(param, value) {
        if (param == "Tolerance" && value > 0) {
            this.nTolerance = value;
        }
        if (param == 'SelectionType') {
            this.selectionType = value;
        }
    }
});

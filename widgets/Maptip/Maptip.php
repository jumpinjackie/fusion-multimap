/**
 * Fusion.Widget.Maptip2
 *
 * $Id: $
 *
 * Portions copyright (c) 2007, DM Solutions Group Inc.
 * Portions copyright (c) 2008, ENPLAN
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
 * Class: Fusion.Widget.Maptip
 *
 * Displays tooltips over the map when the mouse is hovered for some
 * time.  On the MapGuide platform, you must configure tooltips for
 * each layer using Studio or Web Studio by editing the LayerDefinition
 * Settings and specifying an expression for the tooltip. MapServer users
 * can instead specify which attribute fields in the layer are to be used
 * for the maptip text and optional hyperlink.
 *
 *
 * Delay (optional)
 *
 * This is the delay, in milliseconds, that the user must keep the mouse
 * in the same position in order for the maptip to appear.  The default,
 * if not specified, is 350 milliseconds.
 *
 * Layer
 *
 * -MapGuide(optional, multiple): This is the name of a layer from the MapDefinition
 *  to get the tooltip from.  If no Layer elements are specified, then all layers
 *  will be queried and the top-most one will be displayed.  Multiple Layer
 *  tags can be added, allowing tooltips to come from different layers.
 *
 * -Mapserver(required): This is the name of a layer from the MapFile whose attributes
 * will be used to populate the maptip text. Mapserver only supports a single layer.
 * If more than one layer is specified, only the first will be used.
 *
 * Textfield (required for MapServer only)
 *
 * Field to use for the maptip text for MapServer-based Fusion installs.
 * Since this is not specified server-side, as in MapGuide, it must be
 * declared here.
 *
 * Linkfield (optional for MapServer only)
 *
 * Field to use for the maptip hyperlink target URL on MapServer fusion installs.
 * As with Textfield above, it must be declared here if needed.
 *
 * **********************************************************************/

Fusion.Widget.Maptip2 = OpenLayers.Class(Fusion.Widget, {
        oCurrentPosition: null,
        oMapTipPosition: null,
        nTimer: null,
        delay: null,
        aLayers: null,
        bOverTip: false,
        textField: null,
        linkField: null,
        customURL: null,
        sWinFeatures : 'menubar=no,location=no,resizable=no,status=no',

        initializeWidget: function(widgetTag){
           // console.log("maptipStarted");
           // Object.inheritFrom(this, Fusion.Widget.prototype, [widgetTag, true]);
            var json = widgetTag.extension;

            this.sTarget = json.Target ? json.Target[0] : "MaptipWindow";
            if (json.WinFeatures) {
            this.sWinFeatures = json.WinFeatures[0];
            }
            this.delay = json.Delay ? parseInt(json.Delay[0]) : 350;
            this.nTolerance = json.Tolerance ? parseInt(json.Tolerance[0]) : 2;

            this.aLayers = [];
            if (json.Layer) {
                for (var i=0; i<json.Layer.length; i++) {
                    this.aLayers.push(json.Layer[i]);
                }
            }

            this.customURL =  json.CustomURL;
            this.textField = json.TextField;
            this.linkField = json.Linkfield;

            //prepare the container div for the maptips
            Fusion.addWidgetStyleSheet(widgetTag.location + 'Maptip/Maptip.css');
            if (this.domObj) {
            this.domObj.parentNode.removeChild(this.domObj);
            } else {
            this.domObj = document.createElement('div');
            }
            this.domObj.className = 'maptipContainer';
            this.domObj.style.display = 'none';
            this.domObj.style.top = '0px';
            this.domObj.style.left = '0px';

            //create an iframe to stick behind the maptip to prevent clicks being passed through to the map
            this.iframe = document.createElement('iframe');
            this.iframe.className = 'maptipShim';
            this.iframe.scrolling = 'no';
            this.iframe.frameborder = 0;

            OpenLayers.Event.observe(this.domObj, 'mouseover', OpenLayers.Function.bind(this.mouseOverTip, this));
            OpenLayers.Event.observe(this.domObj, 'mouseout', OpenLayers.Function.bind(this.mouseOutTip, this));

            var oDomElem =  this.getMap().getDomObj();
            document.getElementsByTagName('BODY')[0].appendChild(this.domObj);

            this.getMap().observeEvent('mousemove', OpenLayers.Function.bind(this.mouseMove, this));
            this.getMap().observeEvent('mouseout', OpenLayers.Function.bind(this.mouseOut, this));

        },

        mouseOut: function(e) {
        //console.log('maptip mouseOut');
            if (this.nTimer) {
                window.clearTimeout(this.nTimer);
                if (!this.nHideTimer) {
                    /*console.log('mouseOut: set hide timer');*/
                    this.nHideTimer = window.setTimeout(this.hideMaptip.bind(this), 250);
                }
            }
        },

        mouseMove: function(e) {
        //console.log('map tip mouseMove');
            var map = this.getMap();
            var Map = map.aMaps[0];
            if (this.bOverTip) {
                return;
            }
            var p = this.getMap().getEventPosition(e);
            this.oCurrentPosition = p;
            this.oMapTipPosition = {x:e.xy.x, y:e.xy.y};
            if (this.oCurrentPosition) {
                window.clearTimeout(this.nTimer);
                this.nTimer = null;
            }
            //Bind to the appropriate function for the platform
            var showMaptip = this.showMaptip.bind(this)

            this.nTimer = window.setTimeout(showMaptip, this.delay);
            //Event.stop(e);
        },
        /*
        showMaptipMG: function(r) {
            //Gets the maptip data on MapGuide
            console.log('showMaptip');
            var map = this.getMap();
            if (map == null) {
            return;
            }
            var oBroker = Fusion.oBroker;
            var x = this.oCurrentPosition.x;
            var y = this.oCurrentPosition.y;
            var min = map.pixToGeo(x-this.nTolerance, y-this.nTolerance);
            var max = map.pixToGeo(x+this.nTolerance, y+this.nTolerance);
            //this can fail if no map is loaded
            if (!min) {
                return;
            }
            var sGeometry = 'POLYGON(('+ min.x + ' ' +  min.y + ', ' +  min.x + ' ' +  max.y + ', ' + max.x + ' ' +  max.y + ', ' + max.x + ' ' +  min.y + ', ' + min.x + ' ' +  min.y + '))';
            var maxFeatures = 1;
            var persist = 0;
            var selection = 'INTERSECTS';
            // only select visible layers with maptips defined (1+4)
            var layerAttributeFilter = 5;
            var maps = this.getMap().getAllMaps();
            //TODO: possibly make the layer names configurable?
            var layerNames = this.aLayers.toString();
            var r = new Fusion.Lib.MGRequest.MGQueryMapFeatures(maps[0].getSessionID(),
                                            maps[0]._sMapname,
                                            sGeometry,
                                            maxFeatures, persist, selection, layerNames,
                                            layerAttributeFilter);
            oBroker.dispatchRequest(r, this.parseMGXML.bind(this));
        },

        parseMGXML: function(r) {
            //Parses the XML returned by MG and passes the text & link values to the
            //mtDisplay function
            if (r) {
                var d = new DomNode(r);
                var t = d.getNodeText('Tooltip');
                var h = d.getNodeText('Hyperlink');
                var mtDisplayFunc = this.mtDisplay.bind(this);
                mtDisplayFunc(t,h);
            }
        },
        */

        showMaptip: function(r) {
            var pos = this.getMap().pixToGeo(this.oCurrentPosition.x, this.oCurrentPosition.y);
            //console.log(pos);
            var options = {};
            var dfGeoTolerance = this.getMap().pixToGeoMeasure(this.nTolerance);
            var minx = pos.x-dfGeoTolerance;
            var miny = pos.y-dfGeoTolerance;
            var maxx = pos.x+dfGeoTolerance;
            var maxy = pos.y+dfGeoTolerance;
            options.geometry = 'POLYGON(('+ minx + ' ' + miny + ', ' + minx + ' ' + maxy + ', ' + maxx + ' ' + maxy + ', ' + maxx + ' ' + miny + ', ' + minx + ' ' + miny + '))';

            options.selectionType = "INTERSECTS";

            if (this.bActiveOnly) {
                var layer = this.getMap().getActiveLayer();
                if (layer) {
                    options.layers = layer.layerName;
                } else {
                    return;
                }
            }

            var Map = this.getMap().aMaps[0];
            var bPersistant = options.persistent || true;
            var zoomTo = options.zoomTo ?  true : false;
            var loadmapScript = '/layers/'+Map.arch + '/php/maptip.php';
            var params = {
                'mapname': Map._sMapname,
                'session': Map.getSessionID(),
                'spatialfilter': options.geometry || '',
                'maxfeatures': options.maxFeatures || 0, //zero means select all features
                'variant': 'intersects',
                'layer': this.aLayers[0] || '',
                'textfield': this.textField || '',
                'customURL': this.customURL || ''
            }
            var mtDisplayFunc = this.mtDisplay.bind(this);
            var ajaxOptions = {
                onSuccess: function(response){
                        eval("rjson=" + response.responseText);
                        mtDisplayFunc(rjson.mapTipText,rjson.mapTipLink);
                        },
                        parameters: params};
            Fusion.ajaxRequest(loadmapScript, ajaxOptions);
        },

        mtDisplay: function(t,h) {
            //console.log("t:" + t);
            //console.log("h:" + h);

            if (t !="") {
                this.domObj.innerHTML = '&nbsp;';
                var contentDiv = document.createElement('div');
                contentDiv.className = 'maptipContent';
                this.domObj.appendChild(contentDiv);
                var empty = true;
                this.bIsVisible = true;
                if (t != '') {
                    t = t.replace(/\\n/g, "<br>");
                    if (h != '') {
                    var linkDiv = document.createElement('div');
                    var a = document.createElement('a');
                    a.innerHTML = t;
                    a.href = 'javascript:void(0)';
                    a.url = h;
                    a.onclick = this.openLink.bindAsEventListener(a);
                    linkDiv.appendChild(a);
                    contentDiv.appendChild(linkDiv);
                    empty = false;
                    } else {
                        contentDiv.innerHTML = t;
                        empty = false;
                    }
                }
                if (!empty) {
                    this.domObj.style.visibility = 'hidden';
                    this.domObj.style.display = 'block';
                    var size = Element.getCoordinates(this.domObj);
                    // 5 pixels offset added to clear the div from the mouse
                    var mapOffsetX = this.getMap()._oDomObj.offsets[0];
                    var mapOffsetY= this.getMap()._oDomObj.offsets[1];

                    this.domObj.style.top = (this.oCurrentPosition.y  ) + 'px';
                    this.domObj.style.left = (this.oCurrentPosition.x )+ 'px';

                    if (!window.opera) {
                        contentDiv.appendChild(this.iframe);
                        var size = Element.getContentBoxSize(this.domObj);
                        this.iframe.style.width = size.width + "px";
                        this.iframe.style.height = size.height + "px";

                    }

                    this.domObj.style.visibility = 'visible';
                //console.log("maptip visible");

                } else {
                    this.hideMaptip();
                }
            } else {
                this.bIsVisible = false;
                this.hideMaptip();
            }
        },

        hideMaptip: function() {
            //console.log('hideMaptip');
            this.bIsVisible = false;
            this.hideTimer = window.setTimeout(this._hide.bind(this),10);
        },

        _hide: function() {
           //console.log('maptip _hide');
            this.hideTimer = null;
            this.domObj.style.display = 'none';
            //this.oMapTipPosition = null;
        },

        mouseOverTip: function() {
           //console.log('mouseOverTip');
            window.clearTimeout(this.nHideTimer);
            this.nHideTimer = null;
            this.bOverTip = true;
        },

        mouseOutTip: function() {
           //console.log('mouseOutTip');
            this.nHideTimer = window.setTimeout(this.hideMaptip.bind(this), 250);
            this.bOverTip = false;
        },

        openLink : function(evt) {
            var url = this.url;
            var taskPaneTarget = Fusion.getWidgetById(this.sTarget);
            if ( taskPaneTarget ) {
                taskPaneTarget.setContent(url);
            } else {
                var pageElement = $(this.sTarget);
                if ( pageElement ) {
                    pageElement.src = url;
                } else {
                    window.open(url, this.sTarget, this.sWinFeatures);
                }
            }
            OpenLayers.Event.stop(evt, true);
            return false;
        }
    }
);

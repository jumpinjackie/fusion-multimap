/**
 * Fusion.Widget.QuickPlot
 * Copyright (C) 2010 Autodesk, Inc. All rights reserved.
 */

 /*****************************************************************************
 * Class: Fusion.Widget.QuickPlot
 * This widget provides a quick way to print a certain region of map in a good quality
 * **********************************************************************/

Fusion.require("widgets/QuickPlot/MapCapturer.js");
Fusion.require("widgets/QuickPlot/PreviewDialog.js");

Fusion.Widget.QuickPlot = OpenLayers.Class(Fusion.Widget, 
{
    isExclusive: true,
    uiClass: Jx.Button,
    sFeatures : 'width=400,height=450,menubar=no,location=no,resizable=no,status=no',
    options : {},
    panel: null,
    //The default DPI to use, if specified will hide the DPI field on the QuickPlot UI and override
    //whatever DPI value is being used for plotting
    defaultDpi: null,
    //A custom paper size list. If specified, will override the default list in the QuickPlot UI
    paperList: null,
    //A custom scale list. If specified, will override the default list in the QuickPlot UI
    scaleList: null,
    //Indicates whether to show the coordinate labels in the QuickPlot preview dialog
    showCoordinatesInPreview: true,
    //Indicates whether to show the sub title in the QuickPlot UI and preview dialog
    showSubTitle: true,
    //Indicates whether cookies will be used to persist QuickPlot UI options
    persistPlotOptions: false,
    
    initializeWidget: function(widgetTag) 
    {
        this.mapCapturer = new OpenLayers.Control.MapCapturer(this.getMap());
        this.getMap().oMapOL.addControl(this.mapCapturer);
        
        var json = widgetTag.extension;
        
        this.sTarget  = json.Target ? json.Target[0] : "PrintPanelWindow";
        this.sBaseUrl = Fusion.getFusionURL() + 'widgets/QuickPlot/QuickPlotPanel.php';
        
        if (json.DefaultDpi) {
            this.defaultDpi = parseInt(json.DefaultDpi[0]);
        }
        
        this.paperList = [];
        if (json.PaperListEntry) {
            for (var i=0; i<json.PaperListEntry.length; i++) 
            {
                var p = json.PaperListEntry[i];
                var name = p.Name[0];
                var size = p.Value[0];
                this.paperList.push({ name: name, size: size });
            }
        }
        this.scaleList = [];
        if (json.ScaleListEntry) {
            for (var i=0; i<json.ScaleListEntry.length; i++) 
            {
                var p = json.ScaleListEntry[i];
                var name = p.Name[0];
                var scale = p.Value[0];
                this.scaleList.push({ name: name, scale: scale });
            }
        }
        
        if (json.ShowSubTitle) { 
            this.showSubTitle = (json.ShowSubTitle[0] == 'true');
        }
        
        if (json.ShowCoordinateLabels) {
            this.showCoordinatesInPreview = (json.ShowCoordinateLabels[0] == 'true');
        }
        
        if (json.RememberPlotOptions) {
            this.persistPlotOptions = (json.RememberPlotOptions[0] == 'true');
        }
        
        this.additionalParameters = [];
        if (json.AdditionalParameter) 
        {
            for (var i=0; i<json.AdditionalParameter.length; i++) 
            {
                var p = json.AdditionalParameter[i];
                var k = p.Key[0];
                var v = p.Value[0];
                this.additionalParameters.push(k+'='+encodeURIComponent(v));
            }
        }
    },

    activate: function() 
    {
        var url = this.sBaseUrl;
        var map = this.getMap();
        var mapLayers      = map.getAllMaps();
        var taskPaneTarget = Fusion.getWidgetById(this.sTarget);
        var pageElement    = $(this.sTarget);

        var mapnames = [];
        for (var i = 0; i < mapLayers.length; i++)
        {
            if (mapLayers[i].arch == "MapGuide")
                mapnames.push(mapLayers[i].getMapName());
        }

        var params = [];
        params.push('locale='+Fusion.locale);
        params.push('session='+map.getSessionID());
        params.push('mapnames='+mapnames.join(":"));
        
        if (taskPaneTarget || pageElement) 
        {
          params.push('popup=false');
        } 
        else 
        {
          params.push('popup=true');
        }

        params = params.concat(this.additionalParameters);

        if (url.indexOf('?') < 0) 
        {
            url += '?';
        } 
        else if (url.slice(-1) != '&') 
        {
            url += '&';
        }
        
        url += params.join('&');
        
        if (taskPaneTarget) 
        {
            taskPaneTarget.setContent(url);
            this.panel = taskPaneTarget.iframe.contentWindow;
        } 
        else 
        {
            if (pageElement) 
            {
                pageElement.src = url;
                this.panel = pageElement.contentWindow;
            } 
            else 
            {
                this.panel = window.open(url, this.sTarget, this.sFeatures);
                if (typeof(this.panel.focus) != 'undefined')
                    this.panel.focus();
            }
        }
        
        // Expand taskpane automatically if it is the target window
        if (panelman)
        {
            var panel = null;
            for (var i = 0; i < panelman.panels.length; ++i)
            {
                panel = panelman.panels[i];
                if (panel.options.contentId == this.sTarget)
                {
                    panelman.maximizePanel(panel);
                    return;
                }
            }
        }
    },
    
    deactivate: function() {
        if (this.mapCapturer.enabled) {
            this.mapCapturer.disable();
        }
    },
    
    /***************************************************************************************
     * The dialogContentLoadedCallback is used to submit the Quick Plot panel's parameters to the preview iframe
     ***************************************************************************************/
    preview: function(dialogConentLoadedCallback, printDpi)
    {
        var map = this.getMap();
        var mapLayers = map.getAllMaps();
        var mapnames = [];
        for (var i = 0; i < mapLayers.length; i++)
        {
            if (mapLayers[i].arch == "MapGuide")
                mapnames.push(mapLayers[i].getMapName());
        }
        
        var capture  = this.mapCapturer.getCaptureBox();
        var normalizedCapture = this.mapCapturer.getNormalizedCapture();
        var vertices = capture.geometry.getVertices();
        this.options.printDpi = printDpi;
        this.options.showCoordinateLabels = this.showCoordinatesInPreview;
        this.options.showSubTitle = this.showSubTitle;
        var options = {mapInfo : {sessionID : map.getSessionID(), name : mapnames.join(":") }, 
                       captureInfo : {topLeftCs : {x : vertices[3].x, y : vertices[3].y},
                                     bottomRightCs : {x : vertices[1].x, y : vertices[1].y}, 
                                     paperSize : {w : this.mapCapturer.paperSize.w, h : this.mapCapturer.paperSize.h},
                                     scaleDenominator : this.mapCapturer.scaleDenominator,
                                     rotation : this.mapCapturer.rotation,
                                     center : capture.geometry.getCentroid(),
                                     params1 : capture.params,
                                     params2 : normalizedCapture.params},
                       params : this.options};
        
        //Only use the Map Capturer's scale if it's actually active because if this is a tiled map,
        //what get's plotted may not be what we're after because it's being rounded to the nearest
        //finite scale from the Map Capturer's scale denominator.
        if (!this.mapCapturer.enabled) {
            options.captureInfo.scaleDenominator = this.getMap().getScale();
        }
        
        if (!this.previewDialog)
        {
            this.previewDialog = new PreviewDialog(options);
        }
        else
        {
            this.previewDialog.mapInfo     = options.mapInfo;
            this.previewDialog.captureInfo = options.captureInfo;
            this.previewDialog.params      = options.params;
        }
        
        this.previewDialog.open(dialogConentLoadedCallback);
    },
    
    cancelPreview: function()
    {
        this.previewDialog.cancel();
    },
    
    printPreview: function()
    {
        this.previewDialog.print();
    },
    
    previewInnerLoaded: function()
    {
        this.previewDialog.previewInnerLoaded();
    }
});
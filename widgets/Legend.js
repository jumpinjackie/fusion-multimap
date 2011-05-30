/**
 * Fusion.Widget.Legend
 *
 * $Id: Legend.js 2136 2010-04-07 21:58:02Z chrisclaydon $
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
 * Class: Fusion.Widget.Legend
 *
 * A widget to display a legend of all layers.
 *
 * **********************************************************************/

Fusion.Widget.Legend = OpenLayers.Class(Fusion.Widget,  {

    /**
     * Constant: defaultLayerDWFIcon
     * {String} The default image for DWF layer
     */
    defaultLayerDWFIcon: 'images/icons/legend-DWF.png',

    /**
     * Constant: defaultLayerRasterIcon
     * {String} The default image for Raster layer
     */
    defaultLayerRasterIcon: 'images/icons/legend-raster.png',

    /**
     * Constant: defaultLayerThemeIcon
     * {String} The default image for layers that are currently themed.
     */
    defaultLayerThemeIcon: 'images/icons/legend-theme.png',

    /**
     * Constant: defaultDisabledLayerIcon
     * {String} The default image for layers that are out of scale.
     */
    defaultDisabledLayerIcon: 'images/icons/legend-layer.png',

    /**
     * Constant: defaultRootFolderIcon
     * {String} The default image for the root folder
     */
    defaultRootFolderIcon: 'images/icons/legend-map.png',

    /**
     * Constant: defaultLayerInfoIcon
     * {String} The default image for layer info
     */
    defaultLayerInfoIcon: 'images/icons/tree_layer_info.png',

    /**
     * Constant: defaultGroupInfoIcon
     * {String} The default image for groupd info
     */
    defaultGroupInfoIcon: 'images/icons/tree_group_info.png',
    
    /**
     * Constant: blankIcon
     * {String} The default placeholder image
     */
    blankIcon: 'images/icons/a_pixel.png',

    initializeWidget: function(widgetTag) {
        // TODO: maybe it's a good idea to do a function like Fusion.Widget.BindRenderer.. for limit the code
        // duplication if we plan to apply this pattern to others widgets
        Fusion.addWidgetStyleSheet(widgetTag.location + 'Legend/Legend.css');

        // TODO: maybe it's a good idea to do a function like Fusion.Widget.BindRenderer.. for limit the code
        //       duplication if we plan to apply this pattern to others widgets
        var json = widgetTag.extension;
        if (json.LegendRenderer)
        {
            var renderer = eval(json.LegendRenderer[0]);
            if (renderer && renderer.prototype.CLASS_NAME
                && renderer.prototype.CLASS_NAME == "Fusion.Widget.Legend.LegendRenderer") {
                this.renderer = new renderer(this, widgetTag);
            } else if (typeof renderer == "function") {
                var renderFunction = renderer;
                this.renderer = new Fusion.Widget.Legend.LegendRenderer(this);
                this.renderer.mapLoaded = renderFunction;
                this.renderer.mapReloaded = renderFunction;
                this.renderer.mapLoading = false;
            } else {
                this.renderer = new Fusion.Widget.Legend.LegendRendererDefault(this, widgetTag);
            }
        } else {
            this.renderer = new Fusion.Widget.Legend.LegendRendererDefault(this, widgetTag);
        }

        if (this.renderer.mapReloaded)
            this.getMap().registerForEvent(Fusion.Event.MAP_RELOADED,
                                           OpenLayers.Function.bind(this.renderer.mapReloaded, this.renderer));
        if (this.renderer.mapLoading)
            this.getMap().registerForEvent(Fusion.Event.MAP_LOADING,
                                           OpenLayers.Function.bind(this.renderer.mapLoading,this.renderer));
        if (this.renderer.mapLoaded)
            this.getMap().registerForEvent(Fusion.Event.MAP_LOADED,
                                           OpenLayers.Function.bind(this.renderer.mapLoaded, this.renderer));
    }
});

/* Class: Fusion.Widget.Legend.LegendRenderer
 * This is a class designed to help users to create their own renderer
 * for customize the legend.
 */
Fusion.Widget.Legend.LegendRenderer = OpenLayers.Class(
{
     /**
     * Property: oLegend
     * {<Fusion.Widget.Legend>} The parent widget that uses
     *                                  the renderer.
     */
    oLegend: null,

    /**
     * Property: layerRoot
     * {Groups} The groups of all layers.
     *
     */
    layerRoot: null,

    initialize: function(legend) {
        this.oLegend = legend;
        this.layerRoot = this.getMap().layerRoot;
    },

    /**
     * Method: renderLegend
     * Abstract method that have the main purpose to draw the legend. This method
     * should be implemented by all concrete class.
     *
     */
    renderLegend: function() {},

    /**defaultDisabledLayerIcon
     * Method: mapLoading
     * Abstract method that handle the event: Fusion.Event.MAP_LOADING. This method
     * is optional.
     *
     */
    mapLoading: function() {},

    /**
     * Method: mapLoaded
     * Abstract method that handle the event: Fusion.Event.MAP_LOADED. This method
     * occur only at the first load of the map and should be implemented by all concrete class.
     *
     */
    mapLoaded: function() {},

     /**
     * Method: mapReloaded
     * Abstract method that handle the event: Fusion.Event.MAP_RELOADED. This method
     * should be implemented by all concrete class.
     *
     */
    mapReloaded: function() {},

    /**
     * Method: getMap
     * Helper method to obtains the map.
     *
     * Returns:
     * {<Fusion.Maps>} The map that uses the SelectionPanel Widget.
     */
    getMap: function() {
        return this.oLegend.getMap();
    },

    CLASS_NAME: "Fusion.Widget.Legend.LegendRenderer"
});


/* Class: Fusion.Widget.Legend.LegendRendererDefault
 * This class provide a default legend as a collapsable tree.
 *
 */

Fusion.Widget.Legend.LegendRendererDefault = OpenLayers.Class(Fusion.Widget.Legend.LegendRenderer,
{
    /**
     * Property: showRootFolder
     * {Boolean} This controls whether the tree will have a single root node that
     * contains the name of the map as its label.  By default, the root node does
     * not appear.  Set to "true" or "1" to make the root node appear.
     */
    showRootFolder: false,

    /**
     * Property: currentNode
     * {Jx.TreeNode} The current selected node.
     */
    currentNode: null,

    /**
     * Property: bIsDrawn
     * {Boolean} Determine if the map is drawn.
     */
    bIsDrawn: false,

    /**
     * Property: targetFolder
     * {Jx.TreeFolder} The current TreeFolder that the mouse will interact with.
     */
    targetFolder: null,

    /**
     * Property: bIncludeVisToggle
     * {Boolean} Determine if non-visible layer must be draw in the legend.
     */
    bIncludeVisToggle: true,

    initialize: function(legend, widgetTag) {
        Fusion.Widget.Legend.LegendRenderer.prototype.initialize.apply(this, [legend]);

        var json = widgetTag.extension;
        this.imgLayerDWFIcon = json.LayerDWFIcon ? json.LayerDWFIcon[0] : this.oLegend.defaultLayerDWFIcon;
        this.imgLayerRasterIcon = json.LayerRasterIcon ? json.LayerRasterIcon[0] : this.oLegend.defaultLayerRasterIcon;
        this.imgLayerThemeIcon = json.LayerThemeIcon ? json.LayerThemeIcon[0] : this.oLegend.defaultLayerThemeIcon;
        this.imgDisabledLayerIcon = json.DisabledLayerIcon ? json.DisabledLayerIcon[0] : this.oLegend.defaultDisabledLayerIcon;
        this.imgLayerInfoIcon = json.LayerInfoIcon ? json.LayerInfoIcon[0] : this.oLegend.defaultLayerInfoIcon;
        this.imgGroupInfoIcon = json.GroupInfoIcon ? json.GroupInfoIcon[0] : this.oLegend.defaultGroupInfoIcon;
        this.imgBlankIcon = this.oLegend.blankIcon;

        //not used?
        //this.layerInfoURL = json.LayerInfoURL ? json.LayerInfoURL[0] : '';
        this.selectedLayer = null;

        this.oTree = new Jx.Tree({parent:this.oLegend.domObj});

        this.hideInvisibleLayers = (json.HideInvisibleLayers && json.HideInvisibleLayers[0]) == 'true' ? true : false;
        //don't show the root folder by default
        this.showRootFolder = (json.ShowRootFolder && json.ShowRootFolder[0] == 'true') ? true:false;
        //do show the map folder by default
        this.showMapFolder = (json.ShowMapFolder && json.ShowMapFolder[0] == 'false') ? false:true;

        if (!this.showRootFolder) {
            //console.log('supressing root folder');
            this.oRoot = this.oTree;
        } else {
           // console.log('showing root folder');
            var opt = {
                label: OpenLayers.i18n('defaultMapTitle'),
                open: true,
                draw: this.renderFolderCheckbox,
                contextMenu: this.getContextMenu(),
                'class':'fusionLegendFolder'
            };
            this.oRoot = new Jx.TreeFolder(opt);
            this.oTree.append(this.oRoot);
            this.oRoot.options.contextMenu.add(
                new Jx.Menu.Item({
                    label: OpenLayers.i18n('collapse'),
                    onClick: OpenLayers.Function.bind(this.collapseBranch, this, this.oRoot)
                }),
                new Jx.Menu.Item({
                    label: OpenLayers.i18n('expand'),
                    onClick: OpenLayers.Function.bind(this.expandBranch, this, this.oRoot)
                })
            );
        }

        this.extentsChangedWatcher = this.update.bind(this);
    },

    getContextMenu: function() {
        return new Jx.Menu.Context(this.name).add(
            new Jx.Menu.Item({
                label: OpenLayers.i18n('refresh'),
                onClick: OpenLayers.Function.bind(this.update, this)
            }),
            new Jx.Menu.Item({
                label: OpenLayers.i18n('collapseAll'),
                onClick: OpenLayers.Function.bind(this.collapseAll, this)
            }),
            new Jx.Menu.Item({
                label: OpenLayers.i18n('expandAll'),
                onClick: OpenLayers.Function.bind(this.expandAll, this)
            })
        );
    },

    expandAll: function(folder) {
        for (var i=0; i<this.oTree.nodes.length; i++) {
            var item = this.oTree.nodes[i];
            if (item instanceof Jx.TreeFolder) {
              item.expand();
              this.recurseTree('expand', item);
            }
        }
        if (this.showRootFolder) {
          this.oRoot.expand();
        }
    },

    collapseAll: function(folder) {
        for (var i=0; i<this.oTree.nodes.length; i++) {
            var item = this.oTree.nodes[i];
            if (item instanceof Jx.TreeFolder) {
              item.collapse();
              this.recurseTree('collapse', item);
            }
        }
        if (this.showRootFolder) {
          this.oRoot.collapse();
        }
    },

    collapseBranch: function(folder) {
        folder.collapse();
    },

    expandBranch: function(folder) {
        folder.expand();
    },

  /**
     * recursively descend the tree applying the request operation which is either 'collapse' or 'expand'
     *
     * @param op the operation to execute
     * @param the folder to operate on
     */
    recurseTree: function(op, folder) {
        for (var i=0; i<folder.nodes.length; i++) {
            var item = folder.nodes[i];
            if (item instanceof Jx.TreeFolder) {
                this.recurseTree(op, item);
                item[op]();
            }
        }
    },

    scaleRangesLoaded: function() {
        this.layerRoot = this.getMap().layerRoot;
        this.renderLegend();
    },
    mapLoading: function() {
        this.getMap().deregisterForEvent(Fusion.Event.MAP_EXTENTS_CHANGED, this.extentsChangedWatcher);
        this.clear();
    },

    mapLoaded: function() {
        this.getMap().registerForEvent(Fusion.Event.MAP_EXTENTS_CHANGED, this.extentsChangedWatcher);
        this.getMap().loadScaleRanges(OpenLayers.Function.bind(this.scaleRangesLoaded, this));
    },

    mapReloaded: function() {
        this.getMap().loadScaleRanges(OpenLayers.Function.bind(this.scaleRangesLoaded, this));
    },
    /**
     * the map state has become invalid in some way (layer added, removed,
     * ect).  For now, we just re-request the map state from the server
     * which calls draw which recreates the entire legend from scratch
     *
     * TODO: more fine grained updating of the legend would be nice
     */
    invalidate: function() {
        this.draw();
    },

    /**
     * Callback for legend XML response. Creates a list of layers and sets up event
     * handling. Create groups if applicable.
     * TODO: error handling
     *
     * @param r Object the reponse xhr object
     */
    /*renderLegend: function(r) {
        this.bIsDrawn = false;
        this.clear();

        if (this.showRootFolder) {
            this.oRoot.itemLabelobj.innerHTML = this.getMap().getMapTitle();
        }
        var startGroup = this.layerRoot;
        if (!this.showMapFolder) {
          startGroup = this.layerRoot.groups[0];
        }
        if (!startGroup.legend) {
            startGroup.legend = {};
            startGroup.legend.treeItem = this.oRoot;
        }
        for (var i=0; i<startGroup.groups.length; i++) {
            //startGroup.groups[i].visible = true;
            this.processMapGroup(startGroup.groups[i], this.oRoot);
        }
        for (var i=0; i<startGroup.layers.length; i++) {
            this.processMapLayer(startGroup.layers[i], this.oRoot);
        }
        this.bIsDrawn = true;
        this.update();
    },*/
    renderLegend: function(r) {
        this.bIsDrawn = false;
        this.clear();

        if (this.showRootFolder) {
            this.oRoot.itemLabelobj.innerHTML = this.getMap().getMapTitle();
        }

        if (this.showMapFolder) {
        this.renderGroup(this.layerRoot);
        } else {
        if (this.layerRoot.groups.length > 0) {
            for (var i = 0; i < this.layerRoot.groups.length; i++)
                this.renderGroup(this.layerRoot.groups[i]);
        } else {
            for (var i = 0; i < group.layers.length; i++)
                this.processMapLayer(group.layers[i], this.oRoot);
        }
        }

        this.bIsDrawn = true;
        this.update();
    },

    renderGroup: function(group) {
        if (!group.legend) {
            group.legend = {};
            group.legend.treeItem = this.oRoot;
        }
        for (var i = 0; i < group.groups.length; i++) {
            this.processMapGroup(group.groups[i], this.oRoot);
        }
        for (var i = 0; i < group.layers.length; i++) {
            this.processMapLayer(group.layers[i], this.oRoot);
        }
    },

    processMapGroup: function(group, folder) {
        if (group.displayInLegend) {
            /* make a 'namespace' on the group object to store legend-related info */
            group.legend = {};
            var opt = {
                label: group.legendLabel,
                open: group.expandInLegend,
                draw: this.renderFolderCheckbox,
                contextMenu: this.getContextMenu(),
                'class':'fusionLegendFolder'
            };
            group.legend.treeItem = new Jx.TreeFolder(opt);
            group.legend.treeItem.domObj.store('data', group);
            group.legend.treeItem.options.contextMenu.add(
                new Jx.Menu.Item({
                    label: OpenLayers.i18n('collapse'),
                    onClick: OpenLayers.Function.bind(this.collapseBranch, this, group.legend.treeItem)
                }),
                new Jx.Menu.Item({
                    label: OpenLayers.i18n('expand'),
                    onClick: OpenLayers.Function.bind(this.expandBranch, this, group.legend.treeItem)
                })
            );

            folder.append(group.legend.treeItem);
            if(group.legend.treeItem.checkBox)
            {
                group.legend.treeItem.checkBox.checked = group.visible?true:false;
                OpenLayers.Event.observe(group.legend.treeItem.checkBox, 'click', OpenLayers.Function.bind(this.stateChanged, this, group));
            }

            var groupInfo = group.oMap.getGroupInfoUrl(group.groupName);
            if (groupInfo) {
                var a = document.createElement('a');
                a.href = groupInfo;
                if (groupInfo.indexOf('javascript:') < 0) {
                  a.target = '_blank';
                }
                var img = document.createElement('img');
                Jx.addToImgQueue({element:img, src: this.imgGroupInfoIcon});
                img.border = 0;
                a.appendChild(img);
                group.legend.treeItem.domObj.insertBefore(a, group.legend.treeItem.domObj.childNodes[4]);
            }
            if (this.oSelectionListener) {
                group.legend.treeItem.addEvent('click', OpenLayers.Function.bind(this.selectionChanged, this));
            }
            for (var i=0; i<group.groups.length; i++) {
                this.processMapGroup(group.groups[i], group.legend.treeItem);
            }
            for (var i=0; i<group.layers.length; i++) {
                this.processMapLayer(group.layers[i], group.legend.treeItem);
            }
        }
    },

    processMapLayer: function(layer, folder) {
        /* make a 'namespace' on the layer object to store legend-related info */
        layer.legend = {};
        layer.legend.parentItem = folder;
        layer.legend.currentRange = null;
        layer.oMap.registerForEvent(Fusion.Event.LAYER_PROPERTY_CHANGED, OpenLayers.Function.bind(this.layerPropertyChanged, this));
    },

    layerPropertyChanged: function(eventID, layer) {
        if(layer.legend.treeItem.checkBox)
        {
            layer.legend.treeItem.checkBox.checked = layer.isVisible();
        }
    },

    update: function() {
        if (this.bIsDrawn) {
            window.setTimeout(OpenLayers.Function.bind(this._update, this), 1);
        }
    },

    /**
     * update the tree when the map scale changes
     */
    _update: function() {
        var map = this.getMap();
        var currentScale = map.getScale();
        for (var i=0; i<map.layerRoot.groups.length; i++) {
            this.updateGroupLayers(map.layerRoot.groups[i], currentScale);
        }
        for (var i=0; i<map.layerRoot.layers.length; i++) {
            this.updateLayer(map.layerRoot.layers[i], currentScale);
        }
    },

    /**
     * remove the dom objects representing the legend layers and groups
     */
    clear: function() {
        while (this.oRoot.nodes.length > 0) {
            this.oRoot.remove(this.oRoot.nodes[0]);
        }
    },

    selectionChanged: function(o) {
        if (this.currentNode) {
          //console.log(this.currentNode);
            $(this.currentNode.domObj.childNodes[1]).removeClass('jxTreeItemSelected');
        }
        this.currentNode = o;
        $(this.currentNode.domObj.childNodes[1]).addClass('jxTreeItemSelected');

        var data = o.domObj.retrieve('data');
        if (data instanceof Fusion.Layers.Group) {
            this.getMap().setActiveLayer(null);
        } else {
            this.getMap().setActiveLayer(data);
        }
    },
    updateGroupLayers: function(group, fScale) {
        for (var i=0; i<group.groups.length; i++) {
            this.updateGroupLayers(group.groups[i], fScale);
        }
        for (var i=0; i<group.layers.length; i++) {
            this.updateLayer(group.layers[i], fScale);
        }
    },
    updateLayer: function(layer, fScale) {

        var checkbox = layer.isBaseMapLayer ? false : this.bIncludeVisToggle;
        if (!layer.displayInLegend || !layer.legend) {
            return;
        }
        var range = layer.getScaleRange(fScale);
        if (range == layer.legend.currentRange && layer.legend.treeItem) {
            return;
        }

        layer.legend.currentRange = range;
        if (range != null) {
            if (range.styles.length > 1) {
                //tree item needs to be a folder
                if (!layer.legend.treeItem) {
                    layer.legend.treeItem = this.createFolderItem(layer, checkbox);
                    if(layer.legend.treeItem.checkBox)
                    {
                        OpenLayers.Event.observe(layer.legend.treeItem.checkBox, 'click', OpenLayers.Function.bind(this.stateChanged, this, layer));
                    }
                    layer.parentGroup.legend.treeItem.append(layer.legend.treeItem);
                } else if (layer.legend.treeItem instanceof Jx.TreeItem) {
                    var insertAt = this.clearTreeItem(layer);
                    layer.legend.treeItem = this.createFolderItem(layer, checkbox);
                    if(layer.legend.treeItem.checkBox)
                    {
                        OpenLayers.Event.observe(layer.legend.treeItem.checkBox, 'click', OpenLayers.Function.bind(this.stateChanged, this, layer));
                    }
                    layer.parentGroup.legend.treeItem.insert(layer.legend.treeItem, insertAt);
                } else {
                    while(layer.legend.treeItem.nodes.length > 0) {
                        layer.legend.treeItem.remove(layer.legend.treeItem.nodes[0]);
                    }
                }
                
                if (range.isCompressed)
                {
                    //console.assert(range.styles.length > 2);
                    layer.legend.treeItem.append(this.createTreeItem(layer, range.styles[0], fScale, false));
                    layer.legend.treeItem.append(this.createThemeCompressionItem(range.styles.length - 2));
                    layer.legend.treeItem.append(this.createTreeItem(layer, range.styles[range.styles.length-1], fScale, false));
                }
                else
                {
                    for (var i=0; i<range.styles.length; i++) {
                        if (range.styles[i].skipRendering)
                            continue;
                            
                        var item = this.createTreeItem(layer, range.styles[i], fScale, false);
                        layer.legend.treeItem.append(item);
                    }
                }
            } else {

                var style = range.styles[0];
                if (style && !style.legendLabel) {
                  style.legendLabel = layer.legendLabel;
                }
                if (!layer.legend.treeItem) {
                    layer.legend.treeItem = this.createTreeItem(layer, style, fScale, checkbox);
                    if (checkbox) {
                      OpenLayers.Event.observe(layer.legend.treeItem.checkBox, 'click', OpenLayers.Function.bind(this.stateChanged, this, layer));
                    }

                    layer.parentGroup.legend.treeItem.append(layer.legend.treeItem);
                } else if (layer.legend.treeItem instanceof Jx.TreeFolder) {
                    var insertAt = this.clearTreeItem(layer);
                    layer.legend.treeItem = this.createTreeItem(layer, style, fScale, checkbox);
                    if (checkbox) {
                      OpenLayers.Event.observe(layer.legend.treeItem.checkBox, 'click', OpenLayers.Function.bind(this.stateChanged, this, layer));
                    }

                    layer.parentGroup.legend.treeItem.insert(layer.legend.treeItem, insertAt);
                } else {
                    if (range.styles.length > 0) {
                        layer.legend.treeItem.domImg.style.backgroundImage = 'url('+layer.oMap.getLegendImageURL(fScale, layer, range.styles[0])+')';
                        layer.legend.treeItem.domImg.style.backgroundPosition = '0px 0px';
                        $(layer.legend.treeItem.domObj).removeClass('jxDisabled');
                    } else {
                        $(layer.legend.treeItem.domObj).addClass('jxDisabled');
                    }
                }
            }
            if (checkbox) {
              layer.legend.treeItem.checkBox.checked = layer.visible?true:false;
              if (layer.layerTypes[0] == 4 || layer.layerTypes[0] == 5 || range.styles.length > 0) {
                layer.legend.treeItem.checkBox.disabled = false;
              } else {
                layer.legend.treeItem.checkBox.disabled = true;
              }
            }
        } else {
            if (this.hideInvisibleLayers) {
                if (layer.legend.treeItem) {
                    layer.parentGroup.legend.treeItem.remove(layer.legend.treeItem);
                    layer.legend.treeItem = null;
                }
            } else {
              var newTreeItem = this.createTreeItem(layer, {legendLabel: layer.legendLabel}, null, checkbox);
                if (checkbox) {
                  OpenLayers.Event.observe(newTreeItem.checkBox, 'click', OpenLayers.Function.bind(this.stateChanged, this, layer));
                }
                if (layer.legend.treeItem) {
                    if (checkbox) layer.legend.treeItem.checkBox.disabled = true;
                    layer.parentGroup.legend.treeItem.replace(newTreeItem, layer.legend.treeItem);
                    layer.legend.treeItem.finalize();
                } else {
                    layer.parentGroup.legend.treeItem.append(newTreeItem);
                }
                layer.legend.treeItem = newTreeItem;
            }
        }
        if (layer.legend.treeItem) {
            layer.legend.treeItem.domObj.store('data', layer);
        }
    },
    createThemeCompressionItem: function(number) {
        var opt = {
            label: '... (' + number + ' other styles)',
            draw: this.renderItem,
            contextMenu: this.getContextMenu(),
            image: this.imgBlankIcon
            //TODO: A context menu option for expanding this theme.
        };
        var item = new Jx.TreeItem(opt);
        return item;
    },
    createFolderItem: function(layer, hasCheckbox) {
        var opt = {
            label: layer.legendLabel == '' ? '&nbsp;' : layer.legendLabel,
            open: layer.expandInLegend,
            draw: hasCheckbox ? this.renderFolderCheckbox : this.renderFolder,
            'class':'fusionLegendItemCheckbox',
            contextMenu: this.getContextMenu(),
            // image overrides
            image: this.imgLayerThemeIcon
        };
        var folder = new Jx.TreeFolder(opt);
        folder.options.contextMenu.add(
            new Jx.Menu.Item({
                label: OpenLayers.i18n('collapse'),
                onClick: OpenLayers.Function.bind(this.collapseBranch, this, folder)
            }),
            new Jx.Menu.Item({
                label: OpenLayers.i18n('expand'),
                onClick: OpenLayers.Function.bind(this.expandBranch, this, folder)
            })
        );


        var layerInfo = layer.oMap.getLayerInfoUrl(layer.layerName);
        if (layerInfo) {
            var a = document.createElement('a');
            a.href = layerInfo;
            if (layerInfo.indexOf('javascript:') < 0) {
              a.target = '_blank';
            }
            var img = document.createElement('img');
            Jx.addToImgQueue({element:img, src:this.imgLayerInfoIcon});
            img.border = 0;
            a.appendChild(img);
            folder.domObj.insertBefore(a, folder.domObj.childNodes[4]);
        }
        folder.addEvent('click', OpenLayers.Function.bind(this.selectionChanged, this));

        return folder;
    },
    createTreeItem: function(layer, style, scale, bCheckBox) {
        var opt = {};
        opt.statusIsDefault = layer.statusDefault;

        //set the label
        if (style && style.legendLabel) {
            opt.label = style.legendLabel == '' ? '&nbsp;' : style.legendLabel;
        }

        //set the checkbox rendererer
        if (bCheckBox ) {
            if (!opt.label) {
                opt.label = layer.legendLabel == '' ? '&nbsp;' : layer.legendLabel; 
            }
            opt.draw = this.renderItemCheckBox;
        } else {
            opt.draw = this.renderItem;
        }

        if (!style) {
            opt.image = this.imgDisabledLayerIcon;
            opt.enabled = false;
        } else {
            if(style.iconOpt && style.iconOpt.url){
                opt.image = style.iconOpt.url;
            }else{
                opt.image = layer.oMap.getLegendImageURL(scale, layer, style);
            }
        }
        // MapGuide DWF and Raster layer
         // MapGuide Raster and DWF layer
        if(layer.layerTypes[0] == 4){
            opt.image = this.imgLayerRasterIcon;
            opt.enabled = true;
        } else if(layer.layerTypes[0] == 5){
            opt.image = this.imgLayerDWFIcon;
            opt.enabled = true;
        }
        opt.contextMenu = this.getContextMenu();

        var item = new Jx.TreeItem(opt);
        if (style && style.iconOpt && style.iconX >= 0 && style.iconY >= 0) {
            item.domImg;
            item.domImg.style.backgroundImage = 'url('+opt.image+')';
            item.domImg.src = Jx.aPixel.src;
            item.domImg.style.backgroundPosition = (-1*style.iconX) + 'px ' + (-1*style.iconY) + 'px';
            if (style.iconOpt.width) {
                item.domImg.style.width = style.iconOpt.width + 'px';
            }
            if (style.iconOpt.height) {
                item.domImg.style.height = style.iconOpt.height + 'px';
            }
        }

        if (bCheckBox) {
            //item.domObj.insertBefore(layer.legend.checkBox, item.domObj.childNodes[1]);
            /* only need to add layer info if it has a check box too */
            var layerInfo = layer.oMap.getLayerInfoUrl(layer.layerName);
            if (layerInfo) {
                var a = document.createElement('a');
                a.href = layerInfo;
                if (layerInfo.indexOf('javascript:') < 0) {
                  a.target = '_blank';
                }
                var img = document.createElement('img');
                Jx.addToImgQueue({element:img, src: this.imgLayerInfoIcon});
                img.border = 0;
                a.appendChild(img);
                item.domObj.insertBefore(a, item.domObj.childNodes[4]);
            }
        }

        item.addEvent('click', OpenLayers.Function.bind(this.selectionChanged, this));

        return item;
    },
    clearTreeItem: function(layer) {
        var prevSibling = null;
        if (layer.legend.treeItem && layer.legend.treeItem.owner) {
            prevSibling = layer.legend.treeItem.domObj.previousSibling;
            layer.legend.treeItem.domObj.store('data', null);
            layer.legend.treeItem.owner.remove(layer.legend.treeItem);
            layer.legend.treeItem.finalize();
            layer.legend.treeItem = null;
        }
        return prevSibling;
    },
    stateChanged: function(obj, event) {
        if (obj.legend && obj.legend.treeItem.checkBox) {
            if (obj.legend.treeItem.checkBox.checked) {
                obj.show();
            } else {
                obj.hide();
            }
        }
        OpenLayers.Event.stop(event, true);
    },

    renderFolder: function() {
        var domA = new Element('a',{
            'class':this.options['class'],
            href:'javascript:void(0)',
            events: {
                click: this.selected.bindWithEvent(this),
                dblclick: this.selected.bindWithEvent(this),
                contextmenu: this.options.contextMenu.show.bindWithEvent(this.options.contextMenu)
            }
        });


        this.domImg = document.createElement('img');
        this.domImg.className = 'jxTreeIcon ' + (this.options.imageClass ? this.options.imageClass : '');
        this.domImg.src = Jx.aPixel.src;

        if (this.options.image) {
            this.domImg.style.backgroundImage = 'url('+this.options.image+')';
        }

        var domLabel = new Element('span',{
            'class': 'fusionLegendLabel',
            html: this.options.label
        });

        domA.appendChild(this.domImg);
        domA.appendChild(domLabel);

        this.itemLabelobj = domA;

        return domA;

    },

    renderFolderCheckbox: function() {
        var domA = new Element('a',{
            'class':this.options['class'],
            href:'javascript:void(0)',
            events: {
                click: this.selected.bindWithEvent(this),
                dblclick: this.selected.bindWithEvent(this),
                contextmenu: this.options.contextMenu.show.bindWithEvent(this.options.contextMenu)
            }
        });

        this.checkBox = document.createElement('input');
        this.checkBox.type = 'checkbox';

        this.domImg = document.createElement('img');
        this.domImg.className = 'jxTreeIcon ' + (this.options.imageClass ? this.options.imageClass : '');
        this.domImg.src = Jx.aPixel.src;

        if (this.options.image) {
            this.domImg.style.backgroundImage = 'url('+this.options.image+')';
        }

        var domLabel = new Element('span',{
            'class': 'fusionLegendLabel',
            html: this.options.label
        });

        domA.appendChild(this.checkBox);
        domA.appendChild(this.domImg);
        domA.appendChild(domLabel);

        this.itemLabelobj = domA;

        return domA;

    },

    renderItem: function() {

        var domA = new Element('a', {
            'class': 'fusionLegendItem',
            href: 'javascript:void(0)',
            events: {
                click: this.selected.bindWithEvent(this),
                dblclick: this.selected.bindWithEvent(this),
                contextmenu: this.options.contextMenu.show.bindWithEvent(this.options.contextMenu)
            }
        });


        this.domImg = document.createElement('img');
        this.domImg.className = 'jxTreeIcon ' + (this.options.imageClass ? this.options.imageClass : '');
        this.domImg.src = Jx.aPixel.src;

        if (this.options.image) {
            this.domImg.style.backgroundImage = 'url('+this.options.image+')';
        }

        var domLabel = new Element('span',{
            'class': 'fusionLegendLabel',
            html: this.options.label
        });

        domA.appendChild(this.domImg);
        domA.appendChild(domLabel);
        this.itemLabelobj = domA;

        return domA;
    },

    renderItemCheckBox: function() {
        var domA = new Element('a', {
            'class': 'fusionLegendItemCheckbox',
            'href':'javascript:void(0);',
            events: {
                click: this.selected.bindWithEvent(this),
                dblclick: this.selected.bindWithEvent(this),
                contextmenu: this.options.contextMenu.show.bindWithEvent(this.options.contextMenu)
            }
        });

        this.checkBox = document.createElement('input');
        this.checkBox.type = 'checkbox';

        /* layer is set to "status default" set checkbox to checked , disabled , read only*/
        if(this.options.statusIsDefault){
            this.checkBox.checked = true;
            this.checkBox.disabled = true;
            this.checkBox.readOnly = true;
        }

        this.domImg = document.createElement('img');
        this.domImg.className = 'jxTreeIcon ' + (this.options.imageClass ? this.options.imageClass : '');
        this.domImg.src = Jx.aPixel.src;

        if (this.options.image) {
            this.domImg.style.backgroundImage = 'url('+this.options.image+')';
        }

        var domLabel = new Element('span',{
            'class': 'fusionLegendLabel',
            html: this.options.label
        });


        domA.appendChild(this.checkBox);
        domA.appendChild(this.domImg);
        domA.appendChild(domLabel);
        this.itemLabelobj = domA;

        return domA;
    }

});

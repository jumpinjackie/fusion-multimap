<?php
/**
 * LoadMap
 *
 * $Id: LoadMap.php 1967 2009-11-10 19:38:52Z tnolte $
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

/*****************************************************************************
 * Purpose: Load a mapfile into the session and return information about the
 *          map to the client
 *****************************************************************************/

/* Common starts the session */
include(dirname(__FILE__).'/../../../common/php/Utilities.php');
include(dirname(__FILE__).'/Common.php');
include(dirname(__FILE__).'/Utilities.php');

/* if scales are not set, these become the default values */
define('MIN_SCALE', 1);
define('MAX_SCALE', 1000000000);

/* could potentially make this optional */
$moveToSession = true;

/**
   TODO make it possible to specify only a relative path
   in the WebLayout and have this code know where to
   look for it on the server somehow
 */

/* only do something if a mapfile was requested */
if (isset($_REQUEST['mapfile'])) {

    /* look for mapFileRoot specified in config.json and test to see if the map path in appdef is realitive to it.*/
    $configObj = $_SESSION['fusionConfig'];
    $szFusionRoot = dirname(__FILE__).'/../../../'; // TODO : not a very elegant way of doing this
    $szDblSeparator = DIRECTORY_SEPARATOR.DIRECTORY_SEPARATOR;

    $szMapFromFusionRoot = str_replace($szDblSeparator,DIRECTORY_SEPARATOR,$szFusionRoot.DIRECTORY_SEPARATOR.$_REQUEST['mapfile']);
    $szMapFileRoot = str_replace($szDblSeparator,DIRECTORY_SEPARATOR,$configObj->mapserver->mapFileRoot.DIRECTORY_SEPARATOR.$_REQUEST['mapfile']);

    if( file_exists($szMapFileRoot) ) {
        /* use the realitive path specified in config.json */
        $szMapFile = $szMapFileRoot;
    }
    else
    {
        if( file_exists($szMapFromFusionRoot) ) {
            /* use the realitive path from fusion install root */
            $szMapFile = $szMapFromFusionRoot;
        }
        else
        {
            /* use absolute path from appdef */
            $szMapFile = $_REQUEST['mapfile'];
        }
    }

    $oMap = ms_newMapObj($szMapFile);

    /* optionally move the mapfile to the session */
    if ($moveToSession) {
        //path to map file in the session is used by the client
        $mapId = getSessionSavePath().($oMap->name).".map";
        //modify various paths if necessary
        $pathToMap = dirname($szMapFile);
        $cwd = getcwd();
        chdir($pathToMap);
        $shapePath = $oMap->shapepath;
        $oMap->set('shapepath', realpath($shapePath));
        $symbolSet = $oMap->symbolsetfilename;
        if ($symbolSet != '') {
            $oMap->setSymbolSet(realpath($symbolSet));
        }
        $fontSet = $oMap->fontsetfilename;
        if ($fontSet != '') {
            $oMap->setFontSet(realpath($fontSet));
        }
        /* need to modify all image symbols reference in the map file
         eg STYLE
             SYMBOL "../etc/markers/target-7.gif" : this is relative to the map file
        */

        for ($i=0; $i<$oMap->numlayers; $i++)
        {
            $oLayer = &$oMap->GetLayer($i);
            /* check layername for invalid URI characters and replace */
            $oLayer->set("name",replaceInvalidLayerName($oLayer->name));

            for ($j=0; $j<$oLayer->numclasses; $j++)
            {
                $oClass = $oLayer->GetClass($j);
                /* if keyimage is defined, change the path*/
                if ($oClass->keyimage && strlen($oClass->keyimage) > 0)
                {
                     $oClass->set("keyimage", realpath($oClass->keyimage));
                }
                for ($k=0; $k<$oClass->numstyles; $k++)
                {
                    $oStyle = $oClass->getStyle($k);
                    if ($oStyle->symbolname != "")
                    {
                        if (file_exists(realpath($oStyle->symbolname)))
                        {
                            $oStyle->set("symbolname", realpath($oStyle->symbolname));
                        }
                    }
                }
            }
        }
        $oMap->save($mapId);
        chdir($cwd);
    } else {
        $mapId = $_REQUEST['mapfile'];
    }
} elseif (isset($_SESSION['maps']) && isset($_SESSION['maps'][$mapName])) {
    $oMap = ms_newMapObj($_SESSION['maps'][$mapName]);
    $mapId = getSessionSavePath().($oMap->name).".map";
}

$mapObj = NULL;
if ($oMap) {
    header('Content-type: application/json');
    header('X-JSON: true');
    $mapObj->sessionId = $sessionID;
    $mapObj->mapId = $mapId;

    $mapObj->metadata = NULL;
    if (isset($_REQUEST['map_metadata'])) {
        $mapMetadataKeys = explode(',',$_REQUEST['map_metadata']);
        foreach($mapMetadataKeys as $key) {
            $mapObj->metadata->$key = $oMap->getMetadata($key);
        }
    }

    $mapObj->projString = $oMap->getProjection();
    $mapObj->metersPerUnit = GetMetersPerUnit($oMap->units);

    $mapObj->dpi = $oMap->resolution;
    $mapObj->imagetype = $oMap->imagetype;
    $mapObj->mapName = $oMap->name;
    if (!isset($_SESSION['maps'])) {
        $_SESSION['maps'] = array();
    }
    if (!isset($_SESSION['maps'][$mapObj->mapName])) {
        $_SESSION['maps'][$mapObj->mapName] = $mapId;
    }
    $mapObj->extent = array( $oMap->extent->minx, $oMap->extent->miny,
                             $oMap->extent->maxx, $oMap->extent->maxy );
    $minScale = $oMap->web->minscale == -1 ? MIN_SCALE : $oMap->web->minscale;
    $maxScale = $oMap->web->maxscale == -1 ? MAX_SCALE : $oMap->web->maxscale;
    $title = $oMap->getmetadata('legend_title');
    $mapObj->mapTitle = $title == "" ? $mapObj->mapName : $title;
    //layers
    $mapObj->layers = array();
    for ($i=0;$i<$oMap->numlayers;$i++)
    {
        $layer=$oMap->getLayer($i);
        $layerObj = NULL;

        /* Status Default - If a layer is status Default trac it in layerObj */
        if($layer->status == MS_DEFAULT)
            $layerObj->statusdefault = true;
         else
            $layerObj->statusdefault = false;

        /* rename layes names with invalid characters */
        $layer->set("name",replaceInvalidLayerName($layer->name));

        $layerObj->metadata = NULL;
        if (isset($_REQUEST['layer_metadata'])) {
            $layerMetadataKeys = explode(',',$_REQUEST['layer_metadata']);
            foreach($layerMetadataKeys as $key) {
                $layerObj->metadata->$key = $layer->getMetadata($key);
            }
        }

        //$extent = $layer->getExtent();
        $layerObj->extent = NULL;
        $layerObj->extent->minx = NULL;
        $layerObj->extent->maxx = NULL;
        $layerObj->extent->miny = NULL;
        $layerObj->extent->maxy = NULL;

         // only proceed if extent is valid
        if( isset($GLOBALS["extent"]) )
        {
            $layerObj->extent->minx = $extent->minx;
            $layerObj->extent->maxx = $extent->maxx;
            $layerObj->extent->miny = $extent->miny;
            $layerObj->extent->maxy = $extent->maxy;
        }

         $layerObj->propertyMappings = '';
         $layerObj->uniqueId = $i;
         $layerObj->layerName = $layer->name;
         switch($layer->type) {
             case MS_LAYER_POINT:
                $type = 0;
                break;
             case MS_LAYER_LINE:
                $type = 1;
                break;
             case MS_LAYER_POLYGON:
                $type = 2;
                break;
             case MS_LAYER_RASTER:
                $type = 4;
                break;
             case MS_LAYER_ANNOTATION:
                $type = 8;
                break;
             default:
                $type = 0;
         }
         $layerObj->layerTypes = array($type);

         $displayInLegend = strtolower($layer->getMetaData('displayInLegend'));
         $layerObj->displayInLegend = $displayInLegend == 'false' ? false : true;

         $expandInLegend = strtolower($layer->getMetaData('expandInLegend'));
         $layerObj->expandInLegend = $expandInLegend == 'false' ? false : true;
         $layerObj->resourceId = $layer->name;
         $layerObj->parentGroup = $layer->group;

         $legendLabel = $layer->getMetaData('legendLabel');
         if ($legendLabel == '') {
             $legendLabel = $layer->name;
         }
         $layerObj->legendLabel = $legendLabel;

         $selectable = strtolower($layer->getMetaData('selectable'));
         $layerObj->selectable = $selectable == 'true' ? true : false;

         $layerObj->visible = ($layer->status == MS_ON || $layer->status == MS_DEFAULT);
         $layerObj->actuallyVisible = true;

         $editable = strtolower($layer->getMetaData('editable'));
         $layerObj->editable = $editable == 'true' ? true : false;

         /* process the classes.  The legend expects things
          * organized by scale range so we have to first
          * find all the scale breaks, then create ranges
          * for each scale break pair, then slot the classes
          * into the scale ranges that they apply to.
          */

         $aScaleRanges = array();
         //create a default scale range for the layer as a whole
         $layerMin = $layer->minscale == -1 ? $minScale : $layer->minscale;
         $layerMax = $layer->maxscale == -1 ? $maxScale : $layer->maxscale;

        /* check to see that the layer has a vaild scale range
         * inside the defined map's main min max scale ranges
         * set them to the maps scale ranges if they exceede 
         */
        if($layer->minscale != -1 && $layerMin < $minScale)
            $layerMin = $minScale;

        if($layer->maxscale != -1 && $layerMax > $maxScale)
            $layerMax = $maxScale;

         //find all the unique scale breaks in this layer
         $aScaleBreaks = array($layerMin, $layerMax);
         for ($j=0; $j<$layer->numclasses; $j++) {
             $oClass = $layer->getClass($j);
             $classMin = $oClass->minscale == -1 ? $layerMin : max($oClass->minscale, $layerMin);
             $classMax = $oClass->maxscale == -1 ? $layerMax : min($oClass->maxscale, $layerMax);
             if (!in_array($classMin, $aScaleBreaks)) {
                 array_push($aScaleBreaks, $classMin);
             }
             if (!in_array($classMax, $aScaleBreaks)) {
                 array_push($aScaleBreaks, $classMax);
             }
         }
         //sort them
         sort($aScaleBreaks);

         //create scale ranges for each pair of breaks
         for ($j=0; $j<count($aScaleBreaks)-1; $j++) {
             $scaleRange = NULL;
             $scaleRange->minScale = $aScaleBreaks[$j];
             $scaleRange->maxScale = $aScaleBreaks[$j+1];
             $scaleRange->styles = array();
             array_push($aScaleRanges, $scaleRange);
         }

         //create classes and slot them into the scale breaks
         for ($j=0; $j<$layer->numclasses; $j++) {
             $oClass = $layer->getClass($j);
             $classObj = NULL;
             // Use formatted legend label as defined by CLASS->TITLE
             $classObj->legendLabel = $oClass->title != '' ? $oClass->title : $oClass->name;
             $classObj->filter = $oClass->getExpression();
             $classMin = $oClass->minscale == -1 ? $layerMin : max($oClass->minscale, $layerMin);
             $classMax = $oClass->maxscale == -1 ? $layerMax : min($oClass->maxscale, $layerMax);
             $classObj->minScale = $classMin;
             $classObj->maxScale = $classMax;
             $classObj->index = $j;
             for ($k=0; $k<count($aScaleRanges); $k++) {
                 if ($classMin < $aScaleRanges[$k]->maxScale &&
                     $classMax > $aScaleRanges[$k]->minScale) {
                     array_push($aScaleRanges[$k]->styles, $classObj);
                 }
             }
         }
         //$layerObj->scaleRanges = $aScaleRanges;
         $_SESSION['scale_ranges'][$mapName][$layer->name] = $aScaleRanges;
         /*get the min/max scale for the layer*/
        $nCount = count($aScaleRanges);
        $layerObj->minScale = $aScaleRanges[0]->minScale;
        $layerObj->maxScale = $aScaleRanges[0]->maxScale;
        for ($j=1; $j<$nCount; $j++)
        {
            $layerObj->minScale = min($layerObj->minScale, $aScaleRanges[$j]->minScale);
            $layerObj->maxScale = max($layerObj->maxScale, $aScaleRanges[$j]->maxScale);
        }
        array_push($mapObj->layers, $layerObj);
    }
    $mapObj->groups = array();
    $aGroups = $oMap->getAllGroupNames();
    foreach($aGroups as $groupName) {
        $aLayerIndexes = $oMap->getLayersIndexByGroup($groupName);
        if (count($aLayerIndexes) > 0) {
            array_push($mapObj->groups, getGroupObject($oMap->getLayer($aLayerIndexes[0])));
        }
    }
    echo var2json($mapObj);
}

function getGroupObject($layer) {
    $group = NULL;
    $group->groupName = $layer->group;
    $ll = $layer->getMetaData('groupLegendLabel');
    $group->legendLabel = $ll != '' ? $ll : $group->groupName;
    $group->uniqueId = $group->groupName;
    $b = $layer->getMetaData('groupDisplayInLegend');
    $group->displayInLegend = ($b == 'false') ? false : true;
    $b = $layer->getMetaData('groupExpandInLegend');
    $group->expandInLegend = ($b == 'false') ? false : true;
    $group->layerGroupType = '';
    /* parent is always not set for mapserver since we can't have nested groups */
    $group->parentUniqueId = '';
    $group->parent = '';
    $b = $layer->getMetaData('groupVisible');
    $group->visible = ($b == 'false') ? false : true;
    $group->actuallyVisible = $layer->isVisible();
    $group->groupParent = $layer->getMetaData('groupParent');

    return $group;
}

function GetMetersPerUnit($unit)
{
    if ($unit == MS_INCHES)
      return 0.0254;
    else if ($unit == MS_FEET)
      return 0.3048;
    else if ($unit == MS_MILES)
      return 1609.344;
    else if ($unit == MS_METERS)
      return 1;
    else if ($unit == MS_KILOMETERS)
      return 1000;
    else if ($unit == MS_DD)
      return 111118.7516;
    else if ($unit == MS_PIXELS)
      return 1;

}

function replaceInvalidLayerName($szLayerName){
    /*
    bug http://trac.osgeo.org/fusion/ticket/96 - Invalid characters in layer name (pdeschamps)

    Fusion requests the map imavge via the Mapserver CGI to toggle the layer visibility.
    The layer paramerter for the cgi uses spaces as a delimiter for the layer names this creates
    an issue for the mapserver binary to toggle layers that have these reserved URI characters.
    also removing characters that could pose potential issues with json.
    */
    $aInvalidLayerNameCharacters = array();
    $aInvalidLayerNameCharacters[0] ="&";
    $aInvalidLayerNameCharacters[1] =" ";
    $aInvalidLayerNameCharacters[2] ="#";
    $aInvalidLayerNameCharacters[3] ="\\";
    $aInvalidLayerNameCharacters[4] ="=";
    $aInvalidLayerNameCharacters[5] ="/";
    $aInvalidLayerNameCharacters[6] ="'";

    $aReplace[0] = "_";
    $aReplace[1] = "_";
    $aReplace[2] = "_";
    $aReplace[3] = "_";
    $aReplace[4] = "_";
    $aReplace[5] = "_";
    $aReplace[6] = "_";

    return str_replace($aInvalidLayerNameCharacters,$aReplace,$szLayerName);
}

?>

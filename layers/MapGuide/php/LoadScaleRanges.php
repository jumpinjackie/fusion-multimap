<?php
/**
 *
 * $Id: $
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
 * Utility function to load scale ranges for the layers. Initially
 * scale ranges were returned as part of in LoadMap.php. This allows
 * to reduce the size of information that is returned by LoadMap, by putting
 * elements that are unnessary to the map draw her.
 *****************************************************************************/


include ("Common.php");
if(InitializationErrorOccurred())
{
    DisplayInitializationErrorText();
    exit;
}
include('../../../common/php/Utilities.php');
include('Utilities.php');


$map = new MgMap();
$map->Open($resourceService, $mapName);
$layers=$map->GetLayers();

$scaleObj = NULL;
$scaleObj->layers = array();

for($i=0;$i<$layers->GetCount();$i++)
{
    $layer=$layers->GetItem($i);
    if (isset($_SESSION['scale_ranges']) &&
        isset($_SESSION['scale_ranges'][$layer->GetObjectId()]))
    {
        $scaleranges = $_SESSION['scale_ranges'][$layer->GetObjectId()];
        $layerObj = NULL;
        $layerObj->uniqueId = $layer->GetObjectId();
        $layerObj->scaleRanges = $scaleranges;
        array_push($scaleObj->layers, $layerObj);
    }
 }

header('Content-type: application/json');

echo var2json($scaleObj);
exit;

?>

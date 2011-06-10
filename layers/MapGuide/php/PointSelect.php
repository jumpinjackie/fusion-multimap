<?php

/*****************************************************************************
 * Purpose: create a new selection based on one or more attribute filters and
 *          a spatial filter. This will drill down the specified maps and stop
 *          once a selection has been set
 *****************************************************************************/

try {
    /* set up the session */
    include ("Common.php");
    if(InitializationErrorOccurred())
    {
        DisplayInitializationErrorText();
        exit;
    }
    include('../../../common/php/Utilities.php');
    include('Utilities.php');
    
    $renderSvc = $siteConnection->CreateService(MgServiceType::RenderingService);
    $wktRw = new MgWktReaderWriter();
    
    $mapnames = explode(":", $_REQUEST["mapnames"]);
    $sessionId = $_REQUEST["session"];
    $geomText = $_REQUEST["geometry"];
    $extend = (isset($_REQUEST["extend"]) && $_REQUEST["extend"] == "1");
    $op = MgFeatureSpatialOperations::Intersects;
    
    $geom = $wktRw->Read($geomText);
    
    $maps = array();
    foreach ($mapnames as $mn)
    {
        $map = new MgMap($siteConnection);
        $map->Open($mn);
        array_push($maps, $map);
    }
    
    //Left -> Right : Bottom -> Top
    for($i = count($maps) - 1; $i > 0; $i--) {
        $featInfo = $renderSvc->QueryFeatures($maps[$i],
                                              NULL,
                                              $geom,
                                              $op,
                                              -1);
        if ($featInfo != NULL) {
            $sel = $featInfo->GetSelection();
            $selText = $sel->ToXml();
            //$sel->GetLayers() is broken under this scenario! So just check for the existence of a "Layer" element in the selection XML
            if (strpos($selText, "Layer") === FALSE)
                continue;
            
            $resp = NULL;
            $resp->hasResult = true;
            $resp->mapName = $maps[$i]->GetName();
            $resp->selectionXml = $sel->ToXml();
            $resp->extendSelection = $extend;
            echo var2json($resp);
            exit;
        }
    }
    
    $resp = NULL;
    $resp->hasResult = false;
    echo var2json($resp);
}
catch (MgException $e)
{
    echo "ERROR: " . $e->GetExceptionMessage() . "\n";
    echo $e->GetDetails() . "\n";
    echo $e->GetStackTrace() . "\n";
}

?>
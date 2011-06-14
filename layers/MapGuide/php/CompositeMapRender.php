<?php

/*****************************************************************************
 * Purpose: Render multiple maps into a composite image
 *
 * NOTE: This script can run out of allocated memory if used with a high number
 * of runtime maps and/or used with a ridiculously high DPI value. Ensuring this
 * doesn't happen, is an exercise left for the calling code/widget.
 *****************************************************************************/

include ('Common.php');
include ('Utilities.php');

if(InitializationErrorOccurred())
{
    ob_get_clean(); //Flush out the JSON output which is useless for us
    RenderTextToImage(GetInitializationErrorFullText());
    exit;
}
/*
function MemoryTrace($msg = "")
{
    $size = memory_get_usage();
    $msg2 = "$msg (memory usage: $size)\n";
    error_log($msg2, 3, "CompositeMapRender_Trace.log");
}
*/

try {
    if (!isset($_REQUEST['session']) ||
        !isset($_REQUEST['mapnames']) ||
        !isset($_REQUEST['viewx']) ||
        !isset($_REQUEST['viewy']) ||
        !isset($_REQUEST['viewscale']) ||
        !isset($_REQUEST['width']) ||
        !isset($_REQUEST['height'])) {
        //echo "<Error>Arguments missing </Error>";
        RenderTextToImage("ERROR: Missing script arguments!");
        exit;
    }
    
    //MemoryTrace("*** SCRIPT BEGIN ***");
    
    $session = $_REQUEST['session'];
    $mapnames = explode(":", $_REQUEST['mapnames']);
    $width = $_REQUEST['width'];
    $height = $_REQUEST['height'];
    
    //mapname is of the format mapname1:mapname2:...
    //Draw order is left-right -> bottom-top
    
    //The topmost map will govern the view scale 
    
    $maps = array();
    foreach ($mapnames as $mn)
    {
        $map = new MgMap($siteConnection);
        $map->Open($mn);
        array_push($maps, $map);
    }
    
    //MemoryTrace(count($maps) . " maps opened");
    
    $geomFact = new MgGeometryFactory();
    
    $topMap = $maps[count($maps)-1];
    $renderSvc = $siteConnection->CreateService(MgServiceType::RenderingService);
    
    $center = $geomFact->CreateCoordinateXY($_REQUEST['viewx'], $_REQUEST['viewy']);
    //$scale = $topMap->GetViewScale();
    $scale = $_REQUEST['viewscale'];
    
    //Start rendering
    $masterImg = null;
    $imgs = array();
    for ($i = 0; $i < count($maps); $i++)
    {
        // Get the map agent url
        // Get the correct http protocal
        $mapAgent = "http";
        if (isset($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] == "on")
        {
            $mapAgent .= "s";
        }
        
        $colorStr = $maps[$i]->GetBackgroundColor();
        
        // Get the correct port number
        $mapAgent .= "://127.0.0.1:" . $_SERVER["SERVER_PORT"];
        
        // The Map Group mandates that there's only one base map [0...n] overlays
        // This means the base should be GETMAPIMAGE and everything above is 
        // GETDYNAMICMAPOVERLAYIMAGE to it can be transparently overlaid on top
        $opName = ($i == 0) ? "GETMAPIMAGE" : "GETDYNAMICMAPOVERLAYIMAGE";
        
        // Get the correct virtual directory
        $mapAgent .= substr($_SERVER["REQUEST_URI"], 0, strpos($_SERVER["REQUEST_URI"], "/", 1));
        $mapAgent .="/mapagent/mapagent.fcgi?VERSION=1.0.0&OPERATION=$opName" .
                    "&SESSION=$sessionID" .  
                    "&MAPNAME=" . rawurlencode($maps[$i]->GetName()) .
                    "&FORMAT=PNG" .
                    "&SETVIEWCENTERX=" . $center->GetX() .
                    "&SETVIEWCENTERY=" . $center->GetY() .
                    "&SETVIEWSCALE=$scale" . 
                    "&SETDISPLAYWIDTH=$width" . 
                    "&SETDISPLAYHEIGHT=$height" . 
                    "&CLIP=0";
        
        if (isset($_REQUEST["dpi"]))
        {
            $mapAgent .= "&SETDISPLAYDPI=" . $_REQUEST["dpi"];
        }
        
        //echo "$mapAgent<br/>";
        //MemoryTrace("Preparing to call imagefrompng($mapAgent)");
        $image = imagecreatefrompng($mapAgent);
        //MemoryTrace("imagecreatefrompng($mapAgent) called");
        //array_push($imgs, $image);
        
        $num = $i + 1;
        if ($i == 0)
        {
            $masterImg = $image;
            // Turn on alpha blending 
            imagealphablending($masterImg, true); 
            
            //MemoryTrace("Set base image #$num for composition");
        }
        else
        {
            imagecopy($masterImg, $image, 0, 0, 0, 0, $width, $height);
            //MemoryTrace("image #$num composited to master");
            imagedestroy($image);
            //MemoryTrace("image #$num destroyed");
        }
    }
    
    /*
    for ($i = 1; $i < count($imgs); $i++)
    {
        //Copy to master
        imagecopy($masterImg, $imgs[$i], 0, 0, 0, 0, $width, $height);
    }
    
    for ($i = 1; $i < count($imgs); $i++)
    {
        imagedestroy($imgs[$i]);
    }
    */
    
    // Output header and final image 
    header("Content-type: image/png");
    //header("Content-length: " . imagesize($masterImg));
    imagepng($masterImg); 
  
    imagedestroy($masterImg);
}
catch (MgException $e) {
    $msg = "last error";
    $msg .= "\nERROR: " . $e->GetExceptionMessage() . "\n";
    $msg .= $e->GetDetails() . "\n";
    $msg .= $e->GetStackTrace() . "\n";
    
    RenderTextToImage($msg);
}
catch (Exception $ex) {
    $msg = $e->GetMessage();
    
    RenderTextToImage($msg);
}
?>
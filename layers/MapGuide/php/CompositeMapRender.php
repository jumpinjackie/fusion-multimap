<?php

/*****************************************************************************
 * Purpose: Render multiple maps into a composite image
 *****************************************************************************/

include ('Common.php');
if(InitializationErrorOccurred())
{
    DisplayInitializationErrorText();
    exit;
}

include ('Utilities.php');

try {
    if (!isset($_REQUEST['session']) ||
        !isset($_REQUEST['mapnames']) ||
        !isset($_REQUEST['viewx']) ||
        !isset($_REQUEST['viewy']) ||
        !isset($_REQUEST['viewscale']) ||
        !isset($_REQUEST['width']) ||
        !isset($_REQUEST['height'])) {
        echo "<Error>Arguments missing </Error>";
        exit;
    }
    
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
    
    $geomFact = new MgGeometryFactory();
    
    $topMap = $maps[count($maps)-1];
    $renderSvc = $siteConnection->CreateService(MgServiceType::RenderingService);
    
    $center = $geomFact->CreateCoordinateXY($_REQUEST['viewx'], $_REQUEST['viewy']);
    $scale = $topMap->GetViewScale();
    
    //Start rendering
    $masterImg = null;
    $imgs = array();
    for ($i = 0; $i < count($maps); $i++)
    {
        // Get the map agent url
        // Get the correct http protocal
        $mapAgent = "http";
        if ($_SERVER["HTTPS"] == "on")
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
                    //"&SETDISPLAYDPI=$printDpi" . 
                    "&SETVIEWSCALE=$scale" . 
                    "&SETDISPLAYWIDTH=$width" . 
                    "&SETDISPLAYHEIGHT=$height" . 
                    "&CLIP=0";
                    
        //echo "$mapAgent<br/>";

        $image = imagecreatefrompng($mapAgent);
        array_push($imgs, $image);
        
        if ($i == 0)
        {
            $masterImg = $image;
            // Turn on alpha blending 
            imagealphablending($masterImg, true); 
        }
    }
    
    for ($i = 1; $i < count($imgs); $i++)
    {
        //Copy to master
        imagecopy($masterImg, $imgs[$i], 0, 0, 0, 0, $width, $height);
    }
    
    for ($i = 1; $i < count($imgs); $i++)
    {
        imagedestroy($imgs[$i]);
    }
    
    // Output header and final image 
    header("Content-type: image/png"); 
    imagepng($masterImg); 
  
    imagedestroy($masterImg);
}
catch (MgException $e) {
    echo "last error";
    echo "ERROR: " . $e->GetExceptionMessage() . "\n";
    echo $e->GetDetails() . "\n";
    echo $e->GetStackTrace() . "\n";
}

?>
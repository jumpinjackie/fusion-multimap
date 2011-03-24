<?php
/* command line PHP tool to create an image strip from one or more image files
 * and also generate a CSS style sheet for positioning the images in the strip
 * assuming they will be used as background images
 */

// have to pass at least something on the command line
if ($argc < 2) {
    printHelp();
    exit;
}

// defaults for command line arguments
$depth = 8;
$verbose = false;
$append = false;
$cssFile = 'imagestrip.css';
$stripFile = 'imagestrip.png';
$direction = 'horizontal';
$images = array();

// detect command line arguments
for ($i=1; $i<$argc; $i++) {
    $arg = $argv[$i];
    if ($arg == '-css') {
        $cssFile = $argv[++$i];
    } else if ($arg == '-d') {
        $depth = $argv[++$i];
    } else if ($arg == '-o') {
        $stripFile = $argv[++$i];
    } else if ($arg == '--horizontal') {
        $direction = 'horizontal';
    } else if ($arg == '--append') {
        $append = false;
    } else if ($arg == '-vertical') {
        $direction = 'vertical';
    } else if ($arg == '-v' || $arg == '--verbose') {
        $verbose = true;
    } else{
        array_push($images, $arg);
    }
}

// don't continue if there are no images to process
if (count($images) == 0) {
    echo "No images specified!\n";
    printHelp();
    exit;
}

// overwrite?
if (file_exists($stripFile)) {
    if (!$append) {
        unlink($stripFile);
    }
}
if (file_exists($cssFile)) {
    if (!$append) {
        unlink($cssFile);
    }
}

// extract the type of file we are going to create from the
// input file name
$info = pathinfo($stripFile);
$stripType = $info['extension'];

// make sure the depth is valid for the format
switch($stripType) {
    case 'jpg':
        $depth = 24;
        break;
    case 'gif':
        $depth = 8;
        break;
    case 'png':
        $depth = ($depth == 24 ? 24 : 8);
        break;
    default:
        $depth = 8;
}

if ($verbose) {
    echo "create css file: $cssFile\n";    
    echo "create strip file: $stripFile\n";
    echo "image strip type: $stripType\n";
    echo "image strip depth: $depth\n";
    echo "processing ".count($images)." images\n";
}

$css = '';
$imgObjects = array();
$imgStrip = null;
$w = 0;
$h = 0;
foreach($images as $image) {
    if (file_exists($image)) {
        if ($verbose) {
            echo $image;            
        }
        $info = pathinfo($image);
        $imgObject = false;
        switch($info['extension']) {
            case 'png':
                $imgObject = imagecreatefrompng($image);
                break;
            case 'jpg':
                $imgObject = imagecreatefromjpeg($image);
                break;
            case 'gif':
                $imgObject = imagecreatefromgif($image);
                break;
            default:
                break;
        }
        if ($imgObject === false) {
            echo "** error: $image does not appear to be a supported image, skipping.\n";
            continue;
        }
        $x = imagesx($imgObject);
        $y= imagesy($imgObject);
        if ($direction == 'horizontal') {
            $px = -$w;
            $py = 0;
            $w += $x;
            $h = max($h, $y);            
            
        } else {
            $px = 0;
            $py = -$h;
            $w = max($w, $x);
            $h += $y;
        }
        
        $css .= <<<EOT
img.{$info['filename']} { background-position: {$px}px {$py}px; }

EOT;
        
        if ($verbose) {
            echo ": ($x x $y) @ $px $py\n";
        }

        array_push($imgObjects, $imgObject);
    } else {
        echo "ignoring missing file $image\n";
    }
}

if ($verbose) {
    echo "image strip size: $w x $h\n";    
}

$imgStrip = imagecreatetruecolor($w,$h);
if ($depth == 8) {
    $nTransparent = imagecolorallocate($imgStrip, 0,0,0);
    imagefill($imgStrip, 0, 0, $nTransparent);
} else {
    $nTransparent = imagecolorallocatealpha($imgStrip, 0, 0, 0, 127);
    imagefill($imgStrip, 0, 0, $nTransparent);
    imagealphablending($imgStrip, false);
    imagesavealpha($imgStrip, true);
}

$x = 0;
$y = 0;
foreach($imgObjects as $imgObject) {
    $w = imagesx($imgObject);
    $h =  imagesy($imgObject);
    if (imageistruecolor($imgObject)) {
        // this should be imagecopymerge according to the docs
        // but that doesn't work correctly
        echo "true color\n";
        imagecopy($imgStrip, $imgObject, $x, $y, 0, 0, $w, $h);
    } else {
        imagecopy($imgStrip, $imgObject, $x, $y, 0, 0, $w, $h);
    }
    if ($direction == 'horizontal') {
        $x += $w;
    } else {
        $y += $h;
    }
}

switch($stripType) {
    case 'png':
        if ($depth == 8) {
            imagetruecolortopalette($imgStrip, false, 256);
            imagecolortransparent($imgStrip, $nTransparent);
        }
        imagepng($imgStrip, $stripFile);
        break;
    case 'gif':
        imagegif($imgStrip, $stripFile);
        break;
    case 'jpeg':
        imagejpeg($imgStrip, $stripFile);
        break;
}

file_put_contents($cssFile, $css);

function printHelp() {
    echo "Usage:\n\n";
    echo "    php imagestrip.php [--vertical | --horizontal] [--append] [--verbose] -css <css file name> -o <image strip name> <image> ...\n\n";
    echo "-css <css file name> specifies the name of the css file to create,\n";
    echo "                     default is imagestrip.css if not specified.\n\n";
    echo "-o <image strip name> specifies the name of the image strip file to create,\n";
    echo "                      default is imagestrip.png if not specified.  The type of\n";
    echo "                      image that is created (png, gif or jpeg) is determined by\n";
    echo "                      the extension of the output image strip file name.\n\n";
    echo "-d <depth> specify the bit depth of the image (8 or 24) for formats that\n";
    echo "           support it (jpeg is always 24 and gif is always 8).\n\n";
    echo "--vertical specify that the images should be concatenated vertically\n\n";
    echo "--horizontal specify that the images should be concatenated horizontally\n\n";
    echo "--append specify that the images should be appended to an existing image\n";
    echo "         rather than replacing it.\n\n";
}
?>

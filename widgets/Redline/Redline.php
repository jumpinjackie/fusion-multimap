<?php
/**
 * Measure
 *
 * $Id: Measure.php 1665 2008-11-12 21:46:54Z madair $
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
 *  Redline panel. It also allows a user to upload a file on the server.
 *  The max file size should be setted in the php5.ini.
 *****************************************************************************/

$fusionMGpath = '../../layers/MapGuide/php/';
include $fusionMGpath . 'Common.php';

SetLocalizedFilesPath(GetLocalizationPath());
if(isset($_REQUEST['LOCALE'])) {
    $locale = $_REQUEST['LOCALE'];
} else {
    $locale = GetDefaultLocale();
}

$optionLocal = GetLocalizedString('REDLINEOPTIONS', $locale );
$selectLayerLocal = GetLocalizedString('REDLINESELECTLAYER', $locale );
$newLocal = GetLocalizedString('REDLINENEW', $locale );
$renameLocal = GetLocalizedString('REDLINERENAME', $locale );
$removeLocal = GetLocalizedString('REDLINEREMOVE', $locale );
$drawLocal = GetLocalizedString('REDLINEDRAW', $locale );
$pointLocal = GetLocalizedString('REDLINEPOINT', $locale );
$lineLocal = GetLocalizedString('REDLINELINE', $locale );
$rectangleLocal = GetLocalizedString('REDLINERECTANGLE', $locale );
$polygonLocal = GetLocalizedString('REDLINEPOLYGON', $locale );
$saveLocal = GetLocalizedString('REDLINESAVE', $locale );
$uploadLocal = GetLocalizedString('REDLINEUPLOAD', $locale );
$featuresLocal = GetLocalizedString('REDLINEFEATURES', $locale );

$fileUpload = false;

$action = $_POST['action'];
$file = $_GET['file'];
if (isset($file)) { // it's a uploaded file request
    returnFile($file);
}
else {
    if (isset($action) && ($action == 'upload') && ($_FILES['uploadedfile']['error'] == UPLOAD_ERR_OK)) {
        $fileUpload = true;

        $target_path = tempnam(sys_get_temp_dir(), preg_replace("/\.[^\.]+$/", "", basename( $_FILES['uploadedfile']['name'])).'_');

        if (file_exists($target_path)) {
            unlink($target_path);
        }
        $target_path = $target_path.'.gml';
        $uploadedFilename = basename($target_path);
        if ((!move_uploaded_file($_FILES['uploadedfile']['tmp_name'], $target_path))) {
            $fileUpload = false;
        }
    }
    else if (isset($action)){ $noFile = 1;}
}
?>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN"
          "http://www.w3.org/TR/html4/strict.dtd">
<html>
  <head>
    <meta http-equiv="Content-type" content="text/html; charset=utf-8">
      <title>RedlineTaskPane</title>
    <style type="text/css" media="screen">
        @import url(Redline.css);
    </style>
    </head>
    <body id="RedlineWidget" onload="panelLoaded()">
      <script type="text/javascript">
        function panelLoaded() {
            div = document.createElement("div");
            div.innerHTML = "<div id=\"panelIsLoaded\"/>";
            document.body.appendChild(div);
            <? if ($fileUpload) { ?>
            div = document.createElement("div");
            div.innerHTML = "<div id=\"uploadedFileName\" value=\"<?= $uploadedFilename ?>\"/>";
            document.body.appendChild(div);
            <? } ?>
            <? if (isset($noFile)) {  echo "alert('Please select a file.');"; } ?>

        }
      </script>

      <table id="RedlineWidgetOptions" borders="1" width="100%">
      <tr>
      <td style="font-family: Arial, Helvetica, sans-serif; font-weight: bold; font-size: 13pt">
      <?php echo $optionLocal ?>
      <hr>
      </td>
      </tr>
      <tr>
      <td style="font-family: Arial, Helvetica, sans-serif; font-weight: bold; font-size: 8pt; background-color: #DCDCDC; color: black; height: 20px;"><?php echo $selectLayerLocal ?></td>
      </tr>
      <tr>
      <td>
      <select id="RedlineWidgetLayerList"></select>
      </td>
      </tr>
      <tr>
      <td>
        <button id="RedlineWidgetNewLayerButton"><?php echo $newLocal ?></button>
        <button id="RedlineWidgetRenameLayerButton"><?php echo $renameLocal ?></button>
        <button id="RedlineWidgetRemoveLayerButton"><?php echo $removeLocal ?></button>
      </td>
      </tr>
      <tr>
        <td style="font-family: Arial, Helvetica, sans-serif; font-weight: bold; font-size: 8pt; background-color: #DCDCDC; color: black; height: 20px;"><?php echo $drawLocal ?></td>
       </tr>
       <tr>
        <td>
          <input id="RedlineWidgetPointRadio" type="radio" name="RedlineWidgetDrawRadio"/>
          <label for="RedlineWidgetPointeRadio"><?php echo $pointLocal ?></label><br/>
          <input id="RedlineWidgetLineRadio" type="radio" name="RedlineWidgetDrawRadio"/>
          <label for="RedlineWidgetLineRadio"><?php echo $lineLocal ?></label><br/>
          <input id="RedlineWidgetRectangleRadio" type="radio" name="RedlineWidgetDrawRadio"/>
          <label for="RedlineWidgetRectangleRadio"><?php echo $rectangleLocal ?></label><br/>
          <input id="RedlineWidgetPolygonRadio" type="radio" name="RedlineWidgetDrawRadio"/>
          <label for="RedlineWidgetPolygonRadio"><?php echo $polygonLocal ?></label>
        </td>
      </tr>
      <tr>
        <td>
          <hr/>
          <button id="RedlineWidgetSaveButton"><?php echo $saveLocal ?></button>
        </td>
      </tr>
      <tr>
        <td id="RedlineWidgetUploadTd">
          <form id="RedlineWidgetUploadForm" enctype="multipart/form-data" action="Redline.php" method="post">
             <input type="file" name="uploadedfile"/>
             <input type="hidden" name="action" value="upload"/>
             <input type="hidden" name="LOCALE" value="<?=$locale?>"/>
             <br/>
             <input id="RedlineWidgetUploadButton" type="submit" name="submit_element" value="<?php echo $uploadLocal ?>" />
          </form>
    </td>
      </tr>
      <tr>
        <td><hr/></td>
      </tr>
      <tr>
        <td style="font-family: Arial, Helvetica, sans-serif; font-weight: bold; font-size: 8pt; background-color: #DCDCDC; color: black; height: 20px;">
          <?php echo $featuresLocal ?>
        </td>
        </tr>
      <tr>
        <td>
          <select id="RedlineWidgetFeatureList" size="10">
          </select>
        </td>
      </tr>
      <tr>
        <td>
          <button id="RedlineWidgetRenameFeatureButton"><?php echo $renameLocal ?></button>
          <button id="RedlineWidgetRemoveFeatureButton"><?php echo $removeLocal ?></button>
        </td>
      </tr>
      </table>

    </body>
  </html>


<?php

function returnFile($filename) {

header("Content-type: text/xml");
header("Content-Disposition: attachment; filename=$filename");

$filename = sys_get_temp_dir().'/'.$filename;
$handle = fopen($filename, "r");
$contents = fread($handle, filesize($filename));
fclose($handle);

echo $contents;
exit;
}

?>

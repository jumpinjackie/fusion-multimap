<?php

    $fusionMGpath = '../../layers/MapGuide/php/';
    include $fusionMGpath . 'Common.php';

    $locale = GetDefaultLocale();
    $popup = 0;
    $mapNames = "";
    $sessionId = "";
    $us = "";
    $popup = "false";

    GetRequestParameters();

    $templ = file_get_contents("QuickPlotPanel.templ");
    SetLocalizedFilesPath(GetLocalizationPath());
    $templ = Localize($templ, $locale, GetClientOS());

    $vpath = GetSurroundVirtualPath();
    $jsPath = "";
    print sprintf($templ, $popup, $jsPath);

function GetParameters($params)
{
    global $target, $cmdIndex, $clientWidth, $mapNames, $sessionId, $popup, $us, $locale, $popup;

    $locale    = $params['locale'];
    $mapNames   = $params['mapnames'];
    $sessionId = $params['session'];
    $popup     = $params['popup'];
    $us        = $params['us'];
    $popup     = $params['popup'];
}

function GetRequestParameters()
{
    if($_SERVER['REQUEST_METHOD'] == "POST")
        GetParameters($_POST);
    else
        GetParameters($_GET);
}

?>

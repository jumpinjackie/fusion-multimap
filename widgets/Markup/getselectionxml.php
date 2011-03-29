<?php
	require_once 'classes/markupeditor.php';

	$args = ($_SERVER['REQUEST_METHOD'] == "POST") ? $_POST : $_GET;

	MgInitializeWebTier($CONFIG_FILE);
		
	$markupEditor = new MarkupEditor($args);
	
	header('Content-Type: text/xml');
	echo $markupEditor->GetSelectionXML();
?>
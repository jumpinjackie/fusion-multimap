<?php
	require_once 'classes/markupcommand.php';

	$args = ($_SERVER['REQUEST_METHOD'] == "POST") ? $_POST : $_GET;

	$errorMsg = null;
	$errorDetail = null;
?>
<html>
<head>
	<title>New Markup Layer</title>
    <link rel="stylesheet" href="styles/gt.css" type="text/css">
	
	<script language="javascript">
		var SET_MARKER_COLOR 		= 1;
		var SET_LINE_COLOR 			= 2;
		var SET_FILL_FORE_COLOR 	= 3;
		var SET_FILL_BACK_COLOR		= 4;
		var SET_BORDER_COLOR 		= 5;
		var SET_LABEL_FORE_COLOR 	= 6;
		var SET_LABEL_BACK_COLOR 	= 7;
		var setColor = 0;
	
		var markerColor = "FF0000";
		var lineColor = "0000FF";
		var fillForeColor = "00FF00";
		var fillBackColor = "00FF00";
		var fillBackTrans = true;
		var borderColor = "000000";
		var labelForeColor = "000000";
		var labelBackColor = "FFFFFF";
		
		
		function PickColor(whichColor, allowTransparency, transparent)
        {
            var clr;
			setColor = whichColor;
			
            if (setColor == SET_MARKER_COLOR)
                clr = markerColor;
            else if (setColor == SET_LINE_COLOR)
                clr = lineColor;
            else if (setColor == SET_FILL_FORE_COLOR)
                clr = fillForeColor;
            else if (setColor == SET_FILL_BACK_COLOR)
                clr = fillBackColor;
            else if (setColor == SET_BORDER_COLOR)
                clr = borderColor;
            else if (setColor == SET_LABEL_FORE_COLOR)
                clr = labelForeColor;
            else if (setColor == SET_LABEL_BACK_COLOR)
                clr = labelBackColor;
           else
                return;
				
            height = allowTransparency? 470: 445;
            w = window.open("/mapguide/mapviewerphp/colorpicker.php?LOCALE=en&CLR=" + clr + "&ALLOWTRANS=" + (allowTransparency? "1":"0") + "&TRANS=" + (transparent?"1":"0"), "colorPicker", "toolbar=no,status=no,width=355,height=" + height);
            w.focus();
        }

        function OnColorPicked(clr, trans)
        {
            if (setColor == SET_MARKER_COLOR)
                markerColor = clr;
            else if (setColor == SET_LINE_COLOR)
                lineColor = clr;
            else if (setColor == SET_FILL_FORE_COLOR)
                fillForeColor = clr;
            else if (setColor == SET_FILL_BACK_COLOR)
			{
                fillBackColor = clr;
				fillBackTrans = trans;
			}
            else if (setColor == SET_BORDER_COLOR)
                borderColor = clr;
            else if (setColor == SET_LABEL_FORE_COLOR)
                labelForeColor = clr;
            else if (setColor == SET_LABEL_BACK_COLOR)
                labelBackColor = clr;
           else
                return;

            UpdateColors();
        }

        function UpdateColors()
        {
            var elt;
            document.getElementById("markerColor").value = markerColor;
            elt = document.getElementById("markerSwatch").style;
            elt.backgroundColor = "#" + markerColor;
            elt.color = "#" + markerColor;

            document.getElementById("lineColor").value = lineColor;
            elt = document.getElementById("lineSwatch").style;
            elt.backgroundColor = "#" + lineColor;
            elt.color = "#" + lineColor;

            document.getElementById("fillForeColor").value = fillForeColor;
            elt = document.getElementById("fillFgSwatch").style;
            elt.backgroundColor = "#" + fillForeColor;
            elt.color = "#" + fillForeColor;

            document.getElementById("fillBackColor").value = fillBackColor;
            document.getElementById("fillBackTrans").value = fillBackTrans;
            elt = document.getElementById("fillBgSwatch").style;
            elt.backgroundColor = fillBackTrans ? "#FFFFFF" : "#" + fillBackColor;
            elt.color = fillBackTrans ? "#000000" : "#" + fillBackColor;

            document.getElementById("borderColor").value = borderColor;
            elt = document.getElementById("borderSwatch").style;
            elt.backgroundColor = "#" + borderColor;
            elt.color = "#" + borderColor;

            document.getElementById("labelForeColor").value = labelForeColor;
            elt = document.getElementById("labelFgSwatch").style;
            elt.backgroundColor = "#" + labelForeColor;
            elt.color = "#" + labelForeColor;

            document.getElementById("labelBackColor").value = labelBackColor;
            elt = document.getElementById("labelBgSwatch").style;
            elt.backgroundColor = "#" + labelBackColor;
            elt.color = "#" + labelBackColor;
        }

	</script>
	
</head>

<body marginwidth=5 marginheight=5 leftmargin=5 topmargin=5 bottommargin=5 rightmargin=5>

<?php if ($errorMsg == null) { ?>

<form action="markupmain.php" method="post" enctype="application/x-www-form-urlencoded" id="newMarkupLayerForm" target="_self">

<input name="SESSION" type="hidden" value="<?= $args['SESSION'] ?>">
<input name="MAPNAME" type="hidden" value="<?= $args['MAPNAME'] ?>">
<input name="MARKUPCOMMAND" type="hidden" value="<?= MarkupCommand::Create ?>">

<table class="RegText" border="0" cellspacing="0" width="100%%">
	<tr><td colspan="2" class="Title">New Markup Layer<hr></td></tr>

	<tr><td colspan="2" class="SubTitle">Markup Layer Settings</td></tr>
	<tr><td colspan="2">Markup name:</td></tr>
	<tr><td colspan="2"><input class="Ctrl" name="MARKUPNAME" type="text" maxlength="255" style="width:100%"><br><br></td></tr>

	<tr><td colspan="2" class="SubTitle">Point Style</td></tr>
	<tr>
		<td colspan="2">
			Marker type:<br>
			<select class="Ctrl" name="MARKERTYPE" size="1">
				<option value="Square" selected="selected">Square</option>
				<option value="Circle">Circle</option>
				<option value="Triangle">Triangle</option>
				<option value="Star">Star</option>
				<option value="Cross">Cross</option>
				<option value="X">X</option>
			</select>
		</td>
	</tr>
	<tr>
		<td>
			Size units:<br>
			<select class="Ctrl" name="MARKERSIZEUNITS" size="1">
				<option value="Points" selected="selected">Points</option>
				<option value="Inches">Inches</option>
				<option value="Millimeters">Millimeters</option>
				<option value="Centimeters">Centimeters</option>
				<option value="Meters">Meters</option>
			</select>
		</td>
		<td>
			Marker size:<br>
			<input class="Ctrl" name="MARKERSIZE" type="text" value="10">
		</td>
	</tr>
	<tr>
		<td colspan="2">
			Marker color:<br>
			<span class="Swatch" id="markerSwatch" style="color: #ff0000; background-color: #ff0000">&nbsp;transparent&nbsp;</span>&nbsp;&nbsp;
			<input class="Ctrl" type="button" value="..." style="width: 22px;" onClick="PickColor(SET_MARKER_COLOR,false,false)">
			<br><br>
		</td>
	</tr>

	<tr><td colspan="2" class="SubTitle">Line Style</td></tr>
	<tr>
		<td colspan="2">
			Line pattern:<br>
			<select class="Ctrl" name="LINEPATTERN" size="1">
				<option value="Solid" selected="selected">Solid</option>
				<option value="Dash">Dash</option>
				<option value="Dot">Dot</option>
				<option value="DashDot">DashDot</option>
				<option value="DashDotDot">DashDotDot</option>
				<option value="Rail">Rail</option>
				<option value="BORDER">Border</option>
				<option value="DIVIDE">Divide</option>
				<option value="FENCELINE1">FenceLine</option>
			</select>
		</td>
	</tr>	
	<tr>
		<td width="50%">
			Size units:<br>
			<select class="Ctrl" name="LINESIZEUNITS" size="1">
				<option value="Points">Points</option>
				<option value="Inches">Inches</option>
				<option value="Millimeters">Millimeters</option>
				<option value="Centimeters" selected="selected">Centimeters</option>
				<option value="Meters">Meters</option>
			</select>
		</td>
		<td width="50%">
			Line thickness:<br>
			<input class="Ctrl" name="LINETHICKNESS" type="text" value="0">
		</td>
	</tr>
	<tr>	
		<td colspan="2">
			Line color:<br>
			<span class="Swatch" id="lineSwatch" style="color: #0000ff; background-color: #0000ff">&nbsp;transparent&nbsp;</span>&nbsp;&nbsp;
			<input class="Ctrl" type="button" value="..." style="width: 22px;" onClick="PickColor(SET_LINE_COLOR,false,false)">
			<br><br>
		</td>
	</tr>	
	
	
	<tr><td colspan="2" class="SubTitle">Polygon Style</td></tr>
	<tr>
		<td width="50%">
			Fill pattern:<br>
			<select class="Ctrl" name="FILLPATTERN" size="1">
				<option value="Solid" selected>Solid</option>
				<option value="Net">Net</option>
				<option value="Line">Line</option>
				<option value="Line_45">Line_45</option>
				<option value="Line_90">Line_90</option>
				<option value="Line_135">Line_135</option>
				<option value="Square">Square</option>
				<option value="Box">Box</option>
				<option value="Cross">Cross</option>
				<option value="Dash">Dash</option>
				<option value="Dolmit">Dolmit</option>
				<option value="Hex">Hex</option>
				<option value="Sacncr">Sacncr</option>
				<option value="Steel">Steel</option>
			</select>
		</td>
		<td width="50%">
			Transparency:<br>
			<input class="Ctrl" name="FILLTRANSPARENCY" type="text"  maxlength="3" value="0" style="width:50px">%
		</td>
	</tr>
	<tr>	
		<td width="50%" valign="top">
			Foreground color:<br>
			<span class="Swatch" id="fillFgSwatch" style="color: #00ff00; background-color: #00ff00">&nbsp;transparent&nbsp;</span>&nbsp;&nbsp;
			<input class="Ctrl" type="button" value="..." style="width: 22px;" onClick="PickColor(SET_FILL_FORE_COLOR,false,false)">
			<br><br>
		</td>
		<td width="50%" valign="top">
			Background color:<br>
			<span class="Swatch" id="fillBgSwatch">&nbsp;transparent&nbsp;</span>&nbsp;&nbsp;
			<input class="Ctrl" type="button" value="..." style="width: 22px;" onClick="PickColor(SET_FILL_BACK_COLOR,true,fillBackTrans)">
			<br>
		</td>
	</tr>	
	<tr><td colspan="2"><hr></td></tr>
	<tr>
		<td colspan="2">
			Border pattern:<br>
			<select class="Ctrl" name="BORDERPATTERN" size="1">
				<option value="Solid" selected="selected">Solid</option>
				<option value="Dash">Dash</option>
				<option value="Dot">Dot</option>
				<option value="DashDot">DashDot</option>
				<option value="DashDotDot">DashDotDot</option>
				<option value="Rail">Rail</option>
				<option value="BORDER">Border</option>
				<option value="DIVIDE">Divide</option>
				<option value="FENCELINE1">FenceLine</option>
			</select>
		</td>
	</tr>	
	<tr>
		<td width="50%">
			Size units:<br>
			<select class="Ctrl" name="BORDERSIZEUNITS" size="1">
				<option value="Points">Points</option>
				<option value="Inches">Inches</option>
				<option value="Millimeters">Millimeters</option>
				<option value="Centimeters" selected="selected">Centimeters</option>
				<option value="Meters">Meters</option>
			</select>
		</td>
		<td width="50%">
			Border thickness:<br>
			<input class="Ctrl" name="BORDERTHICKNESS" type="text" value="0">
		</td>
	</tr>
	<tr>	
		<td colspan="2">
			Border color:<br>
			<span class="Swatch" id="borderSwatch" style="color: #000000; background-color: #000000">&nbsp;transparent&nbsp;</span>&nbsp;&nbsp;
			<input class="Ctrl" type="button" value="..." style="width: 22px;" onClick="PickColor(SET_BORDER_COLOR,false,false)">
			<br><br>
		</td>
	</tr>	

	<tr><td colspan="2" class="SubTitle">Label Style</td></tr>
	<tr>
		<td width="50%">
			Size units:<br>
			<select class="Ctrl" name="LABELSIZEUNITS" size="1">
				<option value="Points" selected="selected">Points</option>
				<option value="Inches">Inches</option>
				<option value="Millimeters">Millimeters</option>
				<option value="Centimeters">Centimeters</option>
				<option value="Meters">Meters</option>
			</select>
		</td>
		<td width="50%">
			Label font size:<br>
			<input class="Ctrl" name="LABELFONTSIZE" type="text" value="10">
		</td>
	</tr>
	<tr>
		<td colspan="2" valign="middle">
			<input name="LABELBOLD" type="checkbox" value="bold"><label>Bold</label>&nbsp;&nbsp;
			<input name="LABELITALIC" type="checkbox" value="italic"><label>Italic</label>&nbsp;&nbsp;
			<input name="LABELUNDERLINE" type="checkbox" value="underline"><label>Underline</label>
		</td>
	</tr>
	<tr>	
		<td width="50%" valign="top">
			Label color:<br>
			<span class="Swatch" id="labelFgSwatch" style="color: #000000; background-color: #000000">&nbsp;transparent&nbsp;</span>&nbsp;&nbsp;
			<input class="Ctrl" type="button" value="..." style="width: 22px;" onClick="PickColor(SET_LABEL_FORE_COLOR,false,false)">
			<br><br>
		</td>
		<td width="50%" valign="top">
			Background color:<br>
			<span class="Swatch" id="labelBgSwatch" style="color: #FFFFFF; background-color: #FFFFFF">&nbsp;transparent&nbsp;</span>&nbsp;&nbsp;
			<input class="Ctrl" type="button" value="..." style="width: 22px;" onClick="PickColor(SET_LABEL_BACK_COLOR,false,false)">
			<br>
		</td>
	</tr>	
	<tr>
		<td colspan="2">
			Label background style:<br>
			<select class="Ctrl" name="LABELBACKSTYLE" size="1">
				<option value="Ghosted" selected="selected">Ghosted</option>
				<option value="Opaque">Opaque</option>
				<option value="Transparent">Transparent</option>
			</select>
		</td>
	</tr>	

	<tr>
		<td colspan="2" align="right">
			<hr>
			<input class="Ctrl" name="" type="submit" value="OK" style="width:60px">
			<input class="Ctrl" type="button" value="Cancel" style="width:60px">
		</td>
	</tr>

</table>

<input name="MARKERCOLOR" type="hidden" id="markerColor" value="FF0000">
<input name="LINECOLOR" type="hidden" id="lineColor" value="0000FF">
<input name="FILLFORECOLOR" type="hidden" id="fillForeColor" value="00FF00">
<input name="FILLBACKCOLOR" type="hidden" id="fillBackColor" value="00FF00">
<input name="FILLBACKTRANS" type="hidden" id="fillBackTrans" value="true">
<input name="BORDERCOLOR" type="hidden" id="borderColor" value="000000">
<input name="LABELFORECOLOR" type="hidden" id="labelForeColor" value="000000">
<input name="LABELBACKCOLOR" type="hidden" id="labelBackColor" value="FFFFFF">

</form>

<?php } else { ?>

<table class="RegText" border="0" cellspacing="0" width="100%%">
	<tr><td class="Title">Error<hr></td></tr>
	<tr><td><?= $errorMsg ?></td></tr>
	<tr><td><?= $errorDetail ?></td></tr>
</table>

<?php } ?>

</body>

</html>

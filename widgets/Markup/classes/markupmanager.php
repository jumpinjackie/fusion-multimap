<?php

require_once dirname(__FILE__).'/../../../layers/MapGuide/php/Constants.php';
require_once 'classes/markupschemafactory.php';

class MarkupManager
{
    const MARKUP_REGISTRY_NAME = 'MarkupRegistry';

	private $args = null;
	private $site = null;
    private $markupRegistryId = null;

	function __construct($args)
	{
		$this->args = $args;
		$this->site = new MgSiteConnection();
		$this->site->Open(new MgUserInformation($args['SESSION']));
        $this->InitMarkupRegistry();
	}
    
    function InitMarkupRegistry()
    {
        //NOTE: EnumerateResources does not work for session repositories. So to be able to "enumerate"
        //resources, we create a registry feature source that would store this information
    
        $this->markupRegistryId = new MgResourceIdentifier($this->GetResourceIdPrefix().MARKUP_REGISTRY_NAME.".FeatureSource");
        $resourceService = $this->site->CreateService(MgServiceType::ResourceService);
        
        //Create the markup registry feature source if it doesn't already exist
        if (!$resourceService->ResourceExists($this->markupRegistryId))
        {
            $featureService = $this->site->CreateService(MgServiceType::FeatureService);
        
            //Markup Registry Feature Source Schema
            //
            //Default
            //  MarkupRegistry
            //    ResourceId (String, Identity, Not Null)
            //    LayerDefintion (String, Not Null)
            //    Name (String, Not Null)
        
            $markupRegSchema = new MgFeatureSchema("Default", "");
            $markupRegClass = new MgClassDefinition();
            $markupRegClass->SetName("MarkupRegistry");
            
            $markupRegId = new MgDataPropertyDefinition("ResourceId");
            $markupRegId->SetDataType(MgPropertyType::String);
            $markupRegId->SetLength(1024);
            $markupRegId->SetNullable(false);
            
            $layerDefId = new MgDataPropertyDefinition("LayerDefinition");
            $layerDefId->SetDataType(MgPropertyType::String);
            $layerDefId->SetLength(1024);
            $layerDefId->SetNullable(false);
            
            $markupRegName = new MgDataPropertyDefinition("Name");
            $markupRegName->SetDataType(MgPropertyType::String);
            $markupRegName->SetLength(512);
            $markupRegName->SetNullable(false);
            
            $dataProps = $markupRegClass->GetProperties();
            $dataProps->Add($markupRegId);
            $dataProps->Add($layerDefId);
            $dataProps->Add($markupRegName);
            
            $idProps = $markupRegClass->GetIdentityProperties();
            $idProps->Add($markupRegId);
            
            $classes = $markupRegSchema->GetClasses();
            $classes->Add($markupRegClass);
            
            $createSdf = new MgCreateSdfParams("Default", "", $markupRegSchema);
            $featureService->CreateFeatureSource($this->markupRegistryId, $createSdf);
        }
    }
    
    function GetResourceIdPrefix()
    {
        return "Session:" . $this->args["SESSION"] . "//";
    }

	function GetAvailableMarkup()
	{
		$markup = array();
        
        //Query the markup registry
		$featureService = $this->site->CreateService(MgServiceType::FeatureService);
        $query = new MgFeatureQueryOptions();
        $fr = $featureService->SelectFeatures($this->markupRegistryId, "Default:MarkupRegistry", $query);
        while($fr->ReadNext())
        {
            $resId = $fr->GetString("LayerDefinition");
            $resName = $fr->GetString("Name");
        
            $markup[$resId] = $resName;
        }
        $fr->Close();
        
        /*
		$resourceService = $this->site->CreateService(MgServiceType::ResourceService);
        $resourceID = new MgResourceIdentifier("Library://Markup/");
		
		try
		{		
			$byteReader = $resourceService->EnumerateResources($resourceID, 1, "LayerDefinition");
			$resourceListXML = $byteReader->ToString();
			
			$doc = DOMDocument::loadXML($resourceListXML);
			$nodeList = $doc->getElementsByTagName('ResourceId');
			
			foreach ($nodeList as $node)
			{
				$resourceId = new MgResourceIdentifier($node->nodeValue);
				$markup[$resourceId->ToString()] = $resourceId->GetName();
			}
			asort($markup);
		}
		catch (MgResourceNotFoundException $mge)
		{
			// If the Library://Markup folder does not exist, create it.
			$resourceService->SetResource($resourceID, null, null); 
		}*/
		
		return $markup;
	}
		
	function OpenMarkup()
	{
		$resourceService = $this->site->CreateService(MgServiceType::ResourceService);
		
		$map = new MgMap();
		$map->Open($resourceService, $this->args['MAPNAME']);

		// Create the Layer Groups

		$markupGroup = null;
		$layerGroups = $map->GetLayerGroups();
		if ($layerGroups->Contains('_Markup'))
		{
			$markupGroup = $layerGroups->GetItem('_Markup');
		}
		else
		{
			$markupGroup = new MgLayerGroup('_Markup');
			$markupGroup->SetVisible(true);
			$markupGroup->SetLegendLabel('Markup');
			$markupGroup->SetDisplayInLegend(true);
			$layerGroups->Add($markupGroup);
		}

		// Add the Markup Layer
		
		$markupLayerResId = new MgResourceIdentifier($this->args['MARKUPLAYER']);
		$markupLayer = new MgLayer($markupLayerResId, $resourceService);
		$markupLayer->SetName('_' . $markupLayerResId->GetName());
		$markupLayer->SetLegendLabel($markupLayerResId->GetName());
		$markupLayer->SetDisplayInLegend(true);
		$markupLayer->SetSelectable(true);
		$markupLayer->SetGroup($markupGroup);
		$map->GetLayers()->Insert(0, $markupLayer);
		
		$map->Save($resourceService);
	}

	function CloseMarkup()
	{
		$resourceService = $this->site->CreateService(MgServiceType::ResourceService);
		
		$map = new MgMap();
		$map->Open($resourceService, $this->args['MAPNAME']);

		// Add the Markup Layer

		$markupLayerResId = new MgResourceIdentifier($this->args['OPENMARKUP']);
		$index = $map->GetLayers()->IndexOf('_' . $markupLayerResId->GetName());
		$map->GetLayers()->RemoveAt($index);
		
		$map->Save($resourceService);
	}
	
	function CreateMarkup()
	{
		$resourceService = $this->site->CreateService(MgServiceType::ResourceService);
		$featureService = $this->site->CreateService(MgServiceType::FeatureService);
        
        $map = new MgMap();
		$map->Open($resourceService, $this->args['MAPNAME']);

		// Create the Markup Feature Source (SDF)

		$markupSdfResId = new MgResourceIdentifier($this->GetResourceIdPrefix() . $this->args['MARKUPNAME'] . '.FeatureSource');
		
		$markupSchema = MarkupSchemaFactory::CreateMarkupSchema();
		$sdfParams = new MgCreateSdfParams('Default', $map->GetMapSRS(), $markupSchema);
		$featureService->CreateFeatureSource($markupSdfResId, $sdfParams);

		// Create the Markup Layer Definition

		$hexFgTransparency = sprintf("%02x", 255 * (100 - $this->args['FILLTRANSPARENCY']) / 100); // Convert % to an alpha value
		$hexBgTransparency = $this->args['FILLBACKTRANS'] ? "FF" : "00";							 // All or nothing
		$bold = array_key_exists('LABELBOLD', $this->args) ? "true" : "false";
		$italic = array_key_exists('LABELITALIC', $this->args) ? "true" : "false";
		$underline = array_key_exists('LABELUNDERLINE', $this->args) ? "true" : "false";
		
        $markupLayerDefinition = file_get_contents("templates/markuplayerdefinition.xml");
        $markupLayerDefinition = sprintf($markupLayerDefinition, 
			$markupSdfResId->ToString(),						//<ResourceId> - Feature Source
			$this->args['LABELSIZEUNITS'],						//<Unit> - Mark Label
			$this->args['LABELFONTSIZE'],						//<SizeX> - Mark Label Size
			$this->args['LABELFONTSIZE'],						//<SizeY> - Mark Label Size
			'FF' . $this->args['LABELFORECOLOR'],				//<ForegroundColor> - Mark Label
			'FF' . $this->args['LABELBACKCOLOR'],				//<BackgroundColor> - Mark Label
			$this->args['LABELBACKSTYLE'],						//<BackgroundStyle> - Mark Label
			$bold,												//<Bold> - Mark Label
			$italic,											//<Bold> - Mark Label
			$underline,											//<Underlined> - Mark Label
			$this->args['MARKERSIZEUNITS'],						//<Unit> - Mark
			$this->args['MARKERSIZE'],							//<SizeX> - Mark
			$this->args['MARKERSIZE'],							//<SizeY> - Mark
			$this->args['MARKERTYPE'],							//<Shape> - Mark
			'FF' . $this->args['MARKERCOLOR'],					//<ForegroundColor> - Mark
			'FF' . $this->args['MARKERCOLOR'],					//<Color> - Mark
			$this->args['LABELSIZEUNITS'],						//<Unit> - Line Label
			$this->args['LABELFONTSIZE'],						//<SizeX> - Line Label Size
			$this->args['LABELFONTSIZE'],						//<SizeY> - Line Label Size
			'FF' . $this->args['LABELFORECOLOR'],				//<ForegroundColor> - Line Label
			'FF' . $this->args['LABELBACKCOLOR'],				//<BackgroundColor> - Line Label
			$this->args['LABELBACKSTYLE'],						//<BackgroundStyle> - Line Label
			$bold,												//<Bold> - Line Label
			$italic,											//<Bold> - Line Label
			$underline,											//<Underlined> - Line Label			
			$this->args['LINEPATTERN'],							//<LineStyle> - Line
			$this->args['LINETHICKNESS'],						//<Thickness> - Line
			'FF' . $this->args['LINECOLOR'],					//<Color> - Line
			$this->args['LINESIZEUNITS'],						//<Unit> - Line
			$this->args['LABELSIZEUNITS'],						//<Unit> - Polygon Label
			$this->args['LABELFONTSIZE'],						//<SizeX> - Polygon Label Size
			$this->args['LABELFONTSIZE'],						//<SizeY> - Polygon Label Size
			'FF' . $this->args['LABELFORECOLOR'],				//<ForegroundColor> - Polygon Label
			'FF' . $this->args['LABELBACKCOLOR'],				//<BackgroundColor> - Polygon Label
			$this->args['LABELBACKSTYLE'],						//<BackgroundStyle> - Polygon Label
			$bold,												//<Bold> - Polygon Label
			$italic,											//<Bold> - Polygon Label
			$underline,											//<Underlined> - Polygon Label
			$this->args['FILLPATTERN'], 						//<FillPattern> - Fill
			$hexFgTransparency . $this->args['FILLFORECOLOR'], 	//<ForegroundColor> - Fill
			$hexBgTransparency . $this->args['FILLBACKCOLOR'], 	//<BackgroundColor> - Fill
			$this->args['BORDERPATTERN'],						//<LineStyle> - Fill
			$this->args['BORDERTHICKNESS'], 					//<Thickness> - Fill
			'FF' . $this->args['BORDERCOLOR'], 					//<Color> - Fill
			$this->args['BORDERSIZEUNITS']); 					//<Unit> - Fill
		
		$byteSource = new MgByteSource($markupLayerDefinition, strlen($markupLayerDefinition));
        $layerDefId = new MgResourceIdentifier($this->GetResourceIdPrefix() . $this->args['MARKUPNAME'] . '.LayerDefinition');
		$resourceService->SetResource($layerDefId, $byteSource->GetReader(), null);
        
        //Register markup with markup registry
        $props = new MgPropertyCollection();
        $props->Add(new MgStringProperty("ResourceId", $markupSdfResId->ToString()));
        $props->Add(new MgStringProperty("LayerDefinition", $layerDefId->ToString()));
        $props->Add(new MgStringProperty("Name", $layerDefId->GetName()));
        $insertCmd = new MgInsertFeatures("Default:MarkupRegistry", $props);
        
        $cmds = new MgFeatureCommandCollection();
        $cmds->Add($insertCmd);
        
        $res = $featureService->UpdateFeatures($this->markupRegistryId, $cmds, false);
        MarkupManager::CleanupReaders($res);
	}
    
    //Utility function to close all feature readers in a MgPropertyCollection
    static function CleanupReaders($propCol)
    {
        for ($i = 0; $i < $propCol->GetCount(); $i++)
        {
            $prop = $propCol->GetItem($i);
            if ($prop->GetPropertyType() == MgPropertyType::Feature)
            {
                $fr = $prop->GetValue();
                $fr->Close();
            }
        }
    }
	
	function DeleteMarkup()
	{
		$resourceService = $this->site->CreateService(MgServiceType::ResourceService);
        $featureService = $this->site->CreateService(MgServiceType::FeatureService);

		$markupLayerResId = new MgResourceIdentifier($this->args['MARKUPLAYER']);
		$markupSdfResId = new MgResourceIdentifier($this->GetResourceIdPrefix() . $markupLayerResId->GetName() . '.FeatureSource');

		$resourceService->DeleteResource($markupLayerResId);
		$resourceService->DeleteResource($markupSdfResId);
        
        //Delete from markup registry
        $delete = new MgDeleteFeatures("Default:MarkupRegistry", "ResourceId = '" . $markupSdfResId->ToString() . "' AND LayerDefinition = '" . $markupLayerResId->ToString() . "'");
        $cmds = new MgFeatureCommandCollection();
        $cmds->Add($delete);
        
        $res = $featureService->UpdateFeatures($this->markupRegistryId, $cmds, false);
	}

	function GetOpenMarkup()
	{
		$openMarkup = array();
		
		$resourceService = $this->site->CreateService(MgServiceType::ResourceService);
		
		$map = new MgMap();
		$map->Open($resourceService, $this->args['MAPNAME']);
		
		$layerGroups = $map->GetLayerGroups();
		if ($layerGroups->Contains('_Markup'))
		{
			$layers = $map->GetLayers();
			
			for ($i = 0; $i < $layers->GetCount(); $i++)
			{
				$layer = $layers->GetItem($i);
				if (($layer->GetGroup() != null) and ($layer->GetGroup()->GetName() == '_Markup'))
				{
					$openMarkup[$this->GetResourceIdPrefix() . $layer->GetLegendLabel() . '.LayerDefinition'] = $layer->GetLegendLabel();
				}		
			}
			asort($openMarkup);			
		}				
		return $openMarkup;
	}	
}

?>
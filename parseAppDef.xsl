<?xml version="1.0" encoding="ISO-8859-1"?>
<!--
Description: Generates a list of widget and map files required for a single file build of Fusion
$Id$
$Name$
-->

<xsl:stylesheet version="1.0" 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    exclude-result-prefixes="xs">

  <xsl:output method="xml" omit-xml-declaration="yes"/>
  <xsl:strip-space elements="*"/>
  <xsl:param name="buildHome">./build</xsl:param>

  <!-- Root node.  -->
  <xsl:template match="/ApplicationDefinition">
    <xsl:variable name="widgetFileList">
      <xsl:apply-templates select="WidgetSet"/>
    </xsl:variable>
    <xsl:variable name="mapFileList">
      <xsl:apply-templates select="MapSet"/>
    </xsl:variable>
    <AppDef>
      <Widgets>
        <xsl:call-template name="removeDuplicates">
          <xsl:with-param name="str" select="$widgetFileList"/>
          <xsl:with-param name="sep" select="' '"/>
        </xsl:call-template>
      </Widgets>
      <Maps>
        <xsl:call-template name="removeDuplicates">
          <xsl:with-param name="str" select="$mapFileList"/>
          <xsl:with-param name="sep" select="' '"/>
        </xsl:call-template>
      </Maps>
    </AppDef>
  </xsl:template>

  <xsl:template match="Container"/> <!-- empty templates to suppress output -->
  <xsl:template match="MapWidget"/>
  <xsl:template match="InitialView"/>

  <xsl:template match="Widget">
    <xsl:variable name="loc">
      <xsl:choose>
        <xsl:when test="Location">
          <xsl:value-of select="Location"/>
        </xsl:when>
        <xsl:otherwise>widgets</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <xsl:value-of select="$loc"/>/<xsl:value-of select="Type"/>.js 
  </xsl:template>
  
  <xsl:template match="MapGroup/Map">
    <xsl:variable name="layerType">
      <xsl:choose>
        <xsl:when test="Type='MapGuide' or Type='MapServer'">
          <xsl:value-of select="Type"/>
        </xsl:when>
        <xsl:otherwise>Generic</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    layers/<xsl:value-of select="$layerType"/>/<xsl:value-of select="$layerType"/>.js 
  </xsl:template>
  
  <xsl:template name="removeDuplicates"> <!-- tokenize a string -->
    <xsl:param name="str"/> <!-- String to process -->
    <xsl:param name="sep"/> <!-- Legal separator character -->
    <xsl:param name="result"/> <!-- result to be returned -->
    <xsl:choose>
      <xsl:when test="contains($str,$sep)"> <!-- Only tokenize if there is a separator present in the string -->
        <xsl:choose>
          <xsl:when test="not(contains($result, substring-before($str,$sep)))"><!-- result doesn't already contain this token -->
            <xsl:call-template name="removeDuplicates">  <!-- Re-tokenize the new string which is contained after the separator -->
              <xsl:with-param name="str" select="substring-after($str,$sep)"/>
              <xsl:with-param name="sep" select="$sep"/> 
              <xsl:with-param name="result" select="concat($result, ' ', substring-before($str,$sep))"/>
            </xsl:call-template>
          </xsl:when>
          <xsl:otherwise>  <!-- it's a duplicate, continue without concating -->
            <xsl:call-template name="removeDuplicates">  <!-- Re-tokenize the new string which is contained after the separator -->
              <xsl:with-param name="str" select="substring-after($str,$sep)"/>
              <xsl:with-param name="sep" select="$sep"/> 
              <xsl:with-param name="result" select="$result"/>
            </xsl:call-template>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:when>
      <xsl:otherwise>  <!-- If there is nothing else to tokenize, just return the result -->
        <xsl:value-of select="$result"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>

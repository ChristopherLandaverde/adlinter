"""
Tests for GTMFactory — verifies the factory itself produces
structurally correct GTM container dicts that match what the
linter rules expect.
"""

import json
import pytest
from adlint.gtm_factory import (
    GTMFactory,
    param,
    bool_param,
    consent_settings,
)


# ── Structural validity ──────────────────────────────────────────────────

class TestBuildStructure:
    """The .build() output must always have the shape the linter expects."""

    def test_empty_container_has_container_version(self):
        container = GTMFactory.empty()
        assert "containerVersion" in container
        assert isinstance(container["containerVersion"], dict)

    def test_empty_container_omits_empty_arrays(self):
        container = GTMFactory.empty()
        cv = container["containerVersion"]
        # Empty factory should produce no keys (no empty lists)
        assert "tag" not in cv
        assert "trigger" not in cv
        assert "variable" not in cv

    def test_tags_appear_under_container_version(self):
        container = (
            GTMFactory()
            .add_conversion_linker()
            .build()
        )
        assert "tag" in container["containerVersion"]
        assert len(container["containerVersion"]["tag"]) == 1

    def test_triggers_appear_under_container_version(self):
        container = (
            GTMFactory()
            .add_pageview_trigger("All Pages", "1")
            .build()
        )
        assert "trigger" in container["containerVersion"]
        assert len(container["containerVersion"]["trigger"]) == 1

    def test_variables_appear_under_container_version(self):
        container = (
            GTMFactory()
            .add_datalayer_variable("transactionId")
            .build()
        )
        assert "variable" in container["containerVersion"]
        assert len(container["containerVersion"]["variable"]) == 1

    def test_builtin_variables_appear_under_container_version(self):
        container = (
            GTMFactory()
            .add_standard_builtins()
            .build()
        )
        assert "builtInVariable" in container["containerVersion"]
        assert len(container["containerVersion"]["builtInVariable"]) == 5

    def test_build_returns_deep_copy(self):
        """Mutations after build() must not affect the returned dict."""
        factory = GTMFactory().add_conversion_linker()
        result1 = factory.build()
        factory.add_conversion_tag()
        result2 = factory.build()
        assert len(result1["containerVersion"]["tag"]) == 1
        assert len(result2["containerVersion"]["tag"]) == 2

    def test_build_json_is_valid_json(self):
        raw = GTMFactory.clean()
        json_str = GTMFactory().add_conversion_linker().build_json()
        parsed = json.loads(json_str)
        assert "containerVersion" in parsed


# ── Metadata ─────────────────────────────────────────────────────────────

class TestMetadata:
    def test_with_metadata_adds_export_fields(self):
        container = (
            GTMFactory()
            .with_metadata(public_id="GTM-ABC123")
            .add_conversion_linker()
            .build()
        )
        assert container["exportFormatVersion"] == 2
        assert "exportTime" in container
        cv = container["containerVersion"]
        assert cv["accountId"] == "6005838559"
        assert cv["container"]["publicId"] == "GTM-ABC123"


# ── Tag helpers ──────────────────────────────────────────────────────────

class TestConversionLinker:
    def test_type_is_gclidw(self):
        container = GTMFactory().add_conversion_linker().build()
        tag = container["containerVersion"]["tag"][0]
        assert tag["type"] == "gclidw"

    def test_default_name(self):
        container = GTMFactory().add_conversion_linker().build()
        tag = container["containerVersion"]["tag"][0]
        assert tag["name"] == "Google Ads - Conversion Linker"

    def test_custom_name(self):
        container = (
            GTMFactory()
            .add_conversion_linker(name="CL - Custom")
            .build()
        )
        tag = container["containerVersion"]["tag"][0]
        assert tag["name"] == "CL - Custom"

    def test_cross_domain_params(self):
        container = (
            GTMFactory()
            .add_conversion_linker(
                enable_cross_domain=True,
                auto_link_domains="a.com,b.com",
            )
            .build()
        )
        tag = container["containerVersion"]["tag"][0]
        keys = [p["key"] for p in tag["parameter"]]
        assert "enableCrossDomain" in keys
        assert "autoLinkDomains" in keys
        assert "linkerDomains" in keys

    def test_consent_settings(self):
        cs = consent_settings("NEEDED", ["ad_storage"])
        container = (
            GTMFactory()
            .add_conversion_linker(consent=cs)
            .build()
        )
        tag = container["containerVersion"]["tag"][0]
        assert tag["consentSettings"]["consentStatus"] == "NEEDED"


class TestConversionTag:
    def test_type_is_awct(self):
        container = GTMFactory().add_conversion_tag().build()
        tag = container["containerVersion"]["tag"][0]
        assert tag["type"] == "awct"

    def test_has_conversion_id_and_label(self):
        container = (
            GTMFactory()
            .add_conversion_tag(conversion_id="999", conversion_label="XYZ")
            .build()
        )
        tag = container["containerVersion"]["tag"][0]
        id_param = next(p for p in tag["parameter"] if p["key"] == "conversionId")
        label_param = next(p for p in tag["parameter"] if p["key"] == "conversionLabel")
        assert id_param["value"] == "999"
        assert label_param["value"] == "XYZ"

    def test_enhanced_conversions_without_user_data(self):
        container = (
            GTMFactory()
            .add_conversion_tag(enhanced_conversions=True)
            .build()
        )
        tag = container["containerVersion"]["tag"][0]
        keys = [p["key"] for p in tag["parameter"]]
        assert "enableEnhancedConversions" in keys
        assert "enhancedConversionsUserDataVariable" not in keys

    def test_enhanced_conversions_with_user_data(self):
        container = (
            GTMFactory()
            .add_conversion_tag(
                enhanced_conversions=True,
                enhanced_conversions_user_data_var="{{User Email}}",
            )
            .build()
        )
        tag = container["containerVersion"]["tag"][0]
        keys = [p["key"] for p in tag["parameter"]]
        assert "enableEnhancedConversions" in keys
        assert "enhancedConversionsUserDataVariable" in keys

    def test_setup_and_teardown_tags(self):
        container = (
            GTMFactory()
            .add_conversion_tag(
                setup_tag=[{"tagName": "Linker"}],
                teardown_tag=[{"tagName": "Cleanup"}],
            )
            .build()
        )
        tag = container["containerVersion"]["tag"][0]
        assert tag["setupTag"] == [{"tagName": "Linker"}]
        assert tag["teardownTag"] == [{"tagName": "Cleanup"}]

    def test_event_callback_param(self):
        container = (
            GTMFactory()
            .add_conversion_tag(event_callback=True)
            .build()
        )
        tag = container["containerVersion"]["tag"][0]
        keys = [p["key"] for p in tag["parameter"]]
        assert "eventCallback" in keys

    def test_firing_trigger_ids(self):
        container = (
            GTMFactory()
            .add_conversion_tag(firing_trigger_ids=["10", "20"])
            .build()
        )
        tag = container["containerVersion"]["tag"][0]
        assert tag["firingTriggerId"] == ["10", "20"]


class TestGA4EventTag:
    def test_type_is_gaawe(self):
        container = GTMFactory().add_ga4_event().build()
        tag = container["containerVersion"]["tag"][0]
        assert tag["type"] == "gaawe"

    def test_has_event_name_and_measurement_id(self):
        container = (
            GTMFactory()
            .add_ga4_event(event_name="purchase", measurement_id="G-ABC")
            .build()
        )
        tag = container["containerVersion"]["tag"][0]
        en = next(p for p in tag["parameter"] if p["key"] == "eventName")
        mid = next(p for p in tag["parameter"] if p["key"] == "measurementIdOverride")
        assert en["value"] == "purchase"
        assert mid["value"] == "G-ABC"


class TestGA4ConfigTag:
    def test_type_is_googtag(self):
        container = GTMFactory().add_ga4_config().build()
        tag = container["containerVersion"]["tag"][0]
        assert tag["type"] == "googtag"

    def test_has_tag_id(self):
        container = (
            GTMFactory()
            .add_ga4_config(tag_id="G-REAL123")
            .build()
        )
        tag = container["containerVersion"]["tag"][0]
        tid = next(p for p in tag["parameter"] if p["key"] == "tagId")
        assert tid["value"] == "G-REAL123"


class TestRemarketingTag:
    def test_type_is_sp(self):
        container = GTMFactory().add_remarketing_tag().build()
        tag = container["containerVersion"]["tag"][0]
        assert tag["type"] == "sp"

    def test_with_conversion_id(self):
        container = (
            GTMFactory()
            .add_remarketing_tag(conversion_id="555")
            .build()
        )
        tag = container["containerVersion"]["tag"][0]
        cid = next(p for p in tag["parameter"] if p["key"] == "conversionId")
        assert cid["value"] == "555"

    def test_without_conversion_id_has_no_params(self):
        container = GTMFactory().add_remarketing_tag().build()
        tag = container["containerVersion"]["tag"][0]
        assert "parameter" not in tag


class TestCustomHTMLTag:
    def test_type_is_html(self):
        container = GTMFactory().add_custom_html_tag().build()
        tag = container["containerVersion"]["tag"][0]
        assert tag["type"] == "html"

    def test_html_content(self):
        container = (
            GTMFactory()
            .add_custom_html_tag(html="<script>alert(1)</script>")
            .build()
        )
        tag = container["containerVersion"]["tag"][0]
        html_p = next(p for p in tag["parameter"] if p["key"] == "html")
        assert html_p["value"] == "<script>alert(1)</script>"


class TestGenericTag:
    def test_arbitrary_type(self):
        container = (
            GTMFactory()
            .add_tag("Bing - UET", "baut", parameters=[param("uetId", "12345")])
            .build()
        )
        tag = container["containerVersion"]["tag"][0]
        assert tag["type"] == "baut"
        assert tag["parameter"][0]["value"] == "12345"


# ── Trigger helpers ──────────────────────────────────────────────────────

class TestTriggers:
    def test_pageview_trigger(self):
        container = GTMFactory().add_pageview_trigger("All Pages", "1").build()
        trigger = container["containerVersion"]["trigger"][0]
        assert trigger["type"] == "PAGEVIEW"
        assert trigger["triggerId"] == "1"

    def test_init_trigger(self):
        container = GTMFactory().add_init_trigger().build()
        trigger = container["containerVersion"]["trigger"][0]
        assert trigger["type"] == "INIT"

    def test_form_submit_trigger(self):
        container = GTMFactory().add_form_submit_trigger("My Form", "5").build()
        trigger = container["containerVersion"]["trigger"][0]
        assert trigger["type"] == "formSubmit"
        assert trigger["triggerId"] == "5"

    def test_link_click_trigger(self):
        container = GTMFactory().add_link_click_trigger().build()
        trigger = container["containerVersion"]["trigger"][0]
        assert trigger["type"] == "linkClick"

    def test_custom_event_trigger(self):
        container = (
            GTMFactory()
            .add_custom_event_trigger("DL - Purchase", "purchase_complete")
            .build()
        )
        trigger = container["containerVersion"]["trigger"][0]
        assert trigger["type"] == "CUSTOM_EVENT"
        assert "customEventFilter" in trigger
        assert trigger["customEventFilter"][0]["parameter"][1]["value"] == "purchase_complete"

    def test_click_trigger_with_filter(self):
        f = [{
            "type": "CONTAINS",
            "parameter": [
                param("arg0", "{{Click Text}}"),
                param("arg1", "Buy Now"),
            ],
        }]
        container = (
            GTMFactory()
            .add_click_trigger("Buy Button", "10", filters=f)
            .build()
        )
        trigger = container["containerVersion"]["trigger"][0]
        assert trigger["type"] == "CLICK"
        assert trigger["filter"][0]["parameter"][1]["value"] == "Buy Now"

    def test_element_visibility_trigger(self):
        container = (
            GTMFactory()
            .add_element_visibility_trigger(on_screen_ratio="10")
            .build()
        )
        trigger = container["containerVersion"]["trigger"][0]
        assert trigger["type"] == "elementVisibility"
        ratio = next(p for p in trigger["parameter"] if p["key"] == "onScreenRatio")
        assert ratio["value"] == "10"

    def test_scroll_depth_trigger(self):
        container = (
            GTMFactory()
            .add_scroll_depth_trigger(thresholds="10,20,30,40,50,60,70")
            .build()
        )
        trigger = container["containerVersion"]["trigger"][0]
        assert trigger["type"] == "scrollDepth"

    def test_timer_trigger(self):
        container = GTMFactory().add_timer_trigger(interval_ms="2000").build()
        trigger = container["containerVersion"]["trigger"][0]
        assert trigger["type"] == "timer"
        interval = next(p for p in trigger["parameter"] if p["key"] == "interval")
        assert interval["value"] == "2000"


# ── Variable helpers ─────────────────────────────────────────────────────

class TestVariables:
    def test_datalayer_variable(self):
        container = (
            GTMFactory()
            .add_datalayer_variable("Transaction ID", "ecommerce.transaction_id")
            .build()
        )
        var = container["containerVersion"]["variable"][0]
        assert var["type"] == "v"
        assert var["name"] == "Transaction ID"

    def test_datalayer_variable_version(self):
        container = (
            GTMFactory()
            .add_datalayer_variable("myVar", version="1")
            .build()
        )
        var = container["containerVersion"]["variable"][0]
        version_p = next(p for p in var["parameter"] if p["key"] == "dataLayerVersion")
        assert version_p["value"] == "1"

    def test_constant_variable(self):
        container = (
            GTMFactory()
            .add_constant_variable("GA4 ID", "G-ABC123")
            .build()
        )
        var = container["containerVersion"]["variable"][0]
        assert var["type"] == "c"
        val = next(p for p in var["parameter"] if p["key"] == "value")
        assert val["value"] == "G-ABC123"

    def test_javascript_variable(self):
        container = (
            GTMFactory()
            .add_javascript_variable("Custom JS")
            .build()
        )
        var = container["containerVersion"]["variable"][0]
        assert var["type"] == "jsm"

    def test_lookup_table_variable(self):
        container = (
            GTMFactory()
            .add_lookup_table_variable("Form Lookup")
            .build()
        )
        var = container["containerVersion"]["variable"][0]
        assert var["type"] == "smm"

    def test_generic_variable(self):
        container = (
            GTMFactory()
            .add_variable("URL Var", "u", parameters=[param("component", "PATH")])
            .build()
        )
        var = container["containerVersion"]["variable"][0]
        assert var["type"] == "u"


# ── Class-method presets ─────────────────────────────────────────────────

class TestPresets:
    def test_clean_has_linker_and_ga4(self):
        container = GTMFactory.clean()
        tags = container["containerVersion"]["tag"]
        types = {t["type"] for t in tags}
        assert "gclidw" in types
        assert "googtag" in types

    def test_clean_has_two_triggers(self):
        container = GTMFactory.clean()
        triggers = container["containerVersion"]["trigger"]
        assert len(triggers) == 2
        types = {t["type"] for t in triggers}
        assert "PAGEVIEW" in types
        assert "INIT" in types

    def test_missing_linker_has_no_gclidw(self):
        container = GTMFactory.missing_linker()
        tags = container["containerVersion"]["tag"]
        types = {t["type"] for t in tags}
        assert "gclidw" not in types
        assert "googtag" in types

    def test_duplicate_conversions_has_two_awct(self):
        container = GTMFactory.duplicate_conversions()
        tags = container["containerVersion"]["tag"]
        awct_tags = [t for t in tags if t["type"] == "awct"]
        assert len(awct_tags) == 2
        # Same conversionId
        ids = {
            next(p["value"] for p in t["parameter"] if p["key"] == "conversionId")
            for t in awct_tags
        }
        assert len(ids) == 1  # only one unique ID

    def test_duplicate_conversions_same_trigger(self):
        container = GTMFactory.duplicate_conversions(trigger_id="42")
        tags = container["containerVersion"]["tag"]
        awct_tags = [t for t in tags if t["type"] == "awct"]
        for t in awct_tags:
            assert t["firingTriggerId"] == ["42"]


# ── Composability ────────────────────────────────────────────────────────

class TestComposability:
    """Factory should support chaining many entities."""

    def test_complex_container(self):
        container = (
            GTMFactory()
            .add_pageview_trigger("All Pages", "1")
            .add_init_trigger("Init", "2")
            .add_form_submit_trigger("Form Submit", "3")
            .add_conversion_linker(firing_trigger_ids=["1"])
            .add_ga4_config(firing_trigger_ids=["2"])
            .add_conversion_tag(
                "Google Ads - Purchase",
                conversion_id="111",
                firing_trigger_ids=["3"],
            )
            .add_conversion_tag(
                "Google Ads - Lead",
                conversion_id="222",
                firing_trigger_ids=["3"],
            )
            .add_custom_html_tag("cHTML - Pixel", firing_trigger_ids=["1"])
            .add_datalayer_variable("Transaction ID")
            .add_constant_variable("GA4 ID", "G-ABC123")
            .add_standard_builtins()
            .build()
        )
        cv = container["containerVersion"]
        assert len(cv["tag"]) == 5
        assert len(cv["trigger"]) == 3
        assert len(cv["variable"]) == 2
        assert len(cv["builtInVariable"]) == 5

    def test_raw_escape_hatch(self):
        """add_raw_tag allows arbitrary dicts for edge cases."""
        weird_tag = {
            "name": "Weird Tag",
            "type": "cvt_custom_123",
            "customParam": "hello",
        }
        container = GTMFactory().add_raw_tag(weird_tag).build()
        tag = container["containerVersion"]["tag"][0]
        assert tag["customParam"] == "hello"


# ── Param helpers ────────────────────────────────────────────────────────

class TestParamHelpers:
    def test_param_default_type(self):
        p = param("key1", "val1")
        assert p == {"type": "TEMPLATE", "key": "key1", "value": "val1"}

    def test_param_custom_type(self):
        p = param("key1", "val1", "LIST")
        assert p["type"] == "LIST"

    def test_bool_param_true(self):
        p = bool_param("enabled", True)
        assert p == {"type": "BOOLEAN", "key": "enabled", "value": "true"}

    def test_bool_param_false(self):
        p = bool_param("enabled", False)
        assert p == {"type": "BOOLEAN", "key": "enabled", "value": "false"}


class TestConsentSettings:
    def test_minimal_consent(self):
        cs = consent_settings("NOT_NEEDED")
        assert cs == {"consentStatus": "NOT_NEEDED"}

    def test_consent_with_types(self):
        cs = consent_settings("NEEDED", ["ad_storage", "analytics_storage"])
        assert cs["consentStatus"] == "NEEDED"
        assert len(cs["consentType"]["list"]) == 2
        assert cs["consentType"]["list"][0]["value"] == "ad_storage"

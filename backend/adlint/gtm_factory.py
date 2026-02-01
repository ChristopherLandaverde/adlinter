"""
GTMFactory — Mini-Mock builder for GTM container JSON objects.

Generates minimal, structurally valid GTM export dicts that mirror
real Google Tag Manager JSON exports.  Each helper adds exactly the
fields the linter checks actually inspect, keeping test fixtures
tiny and deterministic.

Usage
-----
    container = (
        GTMFactory()
        .add_conversion_linker()
        .add_trigger("All Pages", "PAGEVIEW", "1")
        .build()
    )

The `.build()` output matches the shape consumed by the TypeScript
linter checks (and the Python ports we'll write later).
"""

from __future__ import annotations

import copy
import itertools
import json
from typing import Any


# ---------------------------------------------------------------------------
# Internal ID generators — keep containers unique across tests
# ---------------------------------------------------------------------------
_tag_counter = itertools.count(1)
_trigger_counter = itertools.count(1)
_variable_counter = itertools.count(1)


def _next_tag_id() -> str:
    return str(next(_tag_counter))


def _next_trigger_id() -> str:
    return str(next(_trigger_counter))


def _next_variable_id() -> str:
    return str(next(_variable_counter))


# ---------------------------------------------------------------------------
# Parameter helpers
# ---------------------------------------------------------------------------

def param(key: str, value: str, ptype: str = "TEMPLATE") -> dict:
    """Build a single GTM parameter dict."""
    return {"type": ptype, "key": key, "value": value}


def bool_param(key: str, value: bool) -> dict:
    return {"type": "BOOLEAN", "key": key, "value": str(value).lower()}


# ---------------------------------------------------------------------------
# Consent helpers
# ---------------------------------------------------------------------------

def consent_settings(
    status: str = "NEEDED",
    consent_types: list[str] | None = None,
) -> dict:
    """Build a consentSettings block matching real GTM exports."""
    base: dict[str, Any] = {"consentStatus": status}
    if consent_types:
        base["consentType"] = {
            "type": "LIST",
            "list": [
                {"type": "TEMPLATE", "value": ct} for ct in consent_types
            ],
        }
    return base


# ---------------------------------------------------------------------------
# GTMFactory
# ---------------------------------------------------------------------------

class GTMFactory:
    """Fluent builder that assembles minimal GTM container dicts for testing."""

    def __init__(self) -> None:
        self._tags: list[dict] = []
        self._triggers: list[dict] = []
        self._variables: list[dict] = []
        self._builtin_variables: list[dict] = []
        self._metadata: dict[str, Any] = {}

    # -- low-level adders ---------------------------------------------------

    def add_raw_tag(self, tag: dict) -> GTMFactory:
        """Insert an arbitrary tag dict (escape hatch for edge cases)."""
        self._tags.append(tag)
        return self

    def add_raw_trigger(self, trigger: dict) -> GTMFactory:
        self._triggers.append(trigger)
        return self

    def add_raw_variable(self, variable: dict) -> GTMFactory:
        self._variables.append(variable)
        return self

    # -- trigger helpers ----------------------------------------------------

    def add_trigger(
        self,
        name: str = "All Pages",
        trigger_type: str = "PAGEVIEW",
        trigger_id: str | None = None,
        *,
        filters: list[dict] | None = None,
        custom_event_filter: list[dict] | None = None,
        **extra: Any,
    ) -> GTMFactory:
        trigger: dict[str, Any] = {
            "name": name,
            "type": trigger_type,
            "triggerId": trigger_id or _next_trigger_id(),
        }
        if filters is not None:
            trigger["filter"] = filters
        if custom_event_filter is not None:
            trigger["customEventFilter"] = custom_event_filter
        trigger.update(extra)
        self._triggers.append(trigger)
        return self

    def add_pageview_trigger(
        self,
        name: str = "All Pages",
        trigger_id: str | None = None,
    ) -> GTMFactory:
        return self.add_trigger(name, "PAGEVIEW", trigger_id)

    def add_init_trigger(
        self,
        name: str = "Initialization - All Pages",
        trigger_id: str | None = None,
    ) -> GTMFactory:
        return self.add_trigger(name, "INIT", trigger_id)

    def add_custom_event_trigger(
        self,
        name: str,
        event_name: str,
        trigger_id: str | None = None,
    ) -> GTMFactory:
        tid = trigger_id or _next_trigger_id()
        return self.add_trigger(
            name,
            "CUSTOM_EVENT",
            tid,
            custom_event_filter=[
                {
                    "type": "EQUALS",
                    "parameter": [
                        param("arg0", "{{_event}}"),
                        param("arg1", event_name),
                    ],
                }
            ],
        )

    def add_form_submit_trigger(
        self,
        name: str = "Form Submit",
        trigger_id: str | None = None,
    ) -> GTMFactory:
        return self.add_trigger(name, "formSubmit", trigger_id)

    def add_link_click_trigger(
        self,
        name: str = "Link Click",
        trigger_id: str | None = None,
    ) -> GTMFactory:
        return self.add_trigger(name, "linkClick", trigger_id)

    def add_click_trigger(
        self,
        name: str = "Click",
        trigger_id: str | None = None,
        *,
        filters: list[dict] | None = None,
    ) -> GTMFactory:
        return self.add_trigger(name, "CLICK", trigger_id, filters=filters)

    def add_element_visibility_trigger(
        self,
        name: str = "Element Visible",
        trigger_id: str | None = None,
        *,
        on_screen_ratio: str = "50",
    ) -> GTMFactory:
        return self.add_trigger(
            name,
            "elementVisibility",
            trigger_id,
            parameter=[param("onScreenRatio", on_screen_ratio)],
        )

    def add_scroll_depth_trigger(
        self,
        name: str = "Scroll Depth",
        trigger_id: str | None = None,
        *,
        thresholds: str = "25,50,75,100",
    ) -> GTMFactory:
        return self.add_trigger(
            name,
            "scrollDepth",
            trigger_id,
            parameter=[param("verticalThresholdsPercent", thresholds)],
        )

    def add_timer_trigger(
        self,
        name: str = "Timer",
        trigger_id: str | None = None,
        *,
        interval_ms: str = "30000",
    ) -> GTMFactory:
        return self.add_trigger(
            name,
            "timer",
            trigger_id,
            parameter=[param("interval", interval_ms)],
        )

    # -- tag helpers --------------------------------------------------------

    def _make_tag(
        self,
        name: str,
        tag_type: str,
        *,
        parameters: list[dict] | None = None,
        firing_trigger_ids: list[str] | None = None,
        consent: dict | None = None,
        setup_tag: list[dict] | None = None,
        teardown_tag: list[dict] | None = None,
        tag_firing_option: str | None = None,
        notes: str | None = None,
        **extra: Any,
    ) -> dict:
        tag: dict[str, Any] = {
            "name": name,
            "type": tag_type,
            "tagId": _next_tag_id(),
        }
        if parameters:
            tag["parameter"] = parameters
        if firing_trigger_ids:
            tag["firingTriggerId"] = firing_trigger_ids
        if consent is not None:
            tag["consentSettings"] = consent
        if setup_tag is not None:
            tag["setupTag"] = setup_tag
        if teardown_tag is not None:
            tag["teardownTag"] = teardown_tag
        if tag_firing_option:
            tag["tagFiringOption"] = tag_firing_option
        if notes:
            tag["notes"] = notes
        tag.update(extra)
        return tag

    # Conversion Linker (gclidw)
    def add_conversion_linker(
        self,
        name: str = "Google Ads - Conversion Linker",
        firing_trigger_ids: list[str] | None = None,
        *,
        enable_cross_domain: bool = False,
        auto_link_domains: str | None = None,
        consent: dict | None = None,
    ) -> GTMFactory:
        params = []
        if enable_cross_domain:
            params.append(bool_param("enableCrossDomain", True))
        if auto_link_domains:
            params.append(param("autoLinkDomains", auto_link_domains))
            # Also add linkerDomains — the TS check looks for either key
            params.append(param("linkerDomains", auto_link_domains))
        tag = self._make_tag(
            name,
            "gclidw",
            parameters=params or None,
            firing_trigger_ids=firing_trigger_ids or ["1"],
            consent=consent,
        )
        self._tags.append(tag)
        return self

    # Google Ads Conversion tag (awct)
    def add_conversion_tag(
        self,
        name: str = "Google Ads - Conversion",
        conversion_id: str = "123456789",
        conversion_label: str = "ABCDEF",
        firing_trigger_ids: list[str] | None = None,
        *,
        consent: dict | None = None,
        enhanced_conversions: bool = False,
        enhanced_conversions_user_data_var: str | None = None,
        setup_tag: list[dict] | None = None,
        teardown_tag: list[dict] | None = None,
        event_callback: bool = False,
        extra_params: list[dict] | None = None,
    ) -> GTMFactory:
        params = [
            param("conversionId", conversion_id),
            param("conversionLabel", conversion_label),
        ]
        if enhanced_conversions:
            params.append(bool_param("enableEnhancedConversions", True))
            if enhanced_conversions_user_data_var:
                params.append(
                    param(
                        "enhancedConversionsUserDataVariable",
                        enhanced_conversions_user_data_var,
                    )
                )
        if event_callback:
            params.append(param("eventCallback", "true"))
        if extra_params:
            params.extend(extra_params)

        tag = self._make_tag(
            name,
            "awct",
            parameters=params,
            firing_trigger_ids=firing_trigger_ids,
            consent=consent,
            setup_tag=setup_tag,
            teardown_tag=teardown_tag,
        )
        self._tags.append(tag)
        return self

    # GA4 Event tag (gaawe)
    def add_ga4_event(
        self,
        name: str = "GA4 - Event",
        event_name: str = "page_view",
        measurement_id: str = "G-XXXXXXXXXX",
        firing_trigger_ids: list[str] | None = None,
        *,
        consent: dict | None = None,
        send_ecommerce_data: bool = False,
        extra_params: list[dict] | None = None,
    ) -> GTMFactory:
        params = [
            param("eventName", event_name),
            param("measurementIdOverride", measurement_id),
        ]
        if send_ecommerce_data:
            params.append(bool_param("sendEcommerceData", True))
        if extra_params:
            params.extend(extra_params)

        tag = self._make_tag(
            name,
            "gaawe",
            parameters=params,
            firing_trigger_ids=firing_trigger_ids,
            consent=consent,
        )
        self._tags.append(tag)
        return self

    # GA4 Config tag (googtag)
    def add_ga4_config(
        self,
        name: str = "GA4 - Configuration",
        tag_id: str = "G-XXXXXXXXXX",
        firing_trigger_ids: list[str] | None = None,
        *,
        consent: dict | None = None,
        extra_params: list[dict] | None = None,
    ) -> GTMFactory:
        params = [param("tagId", tag_id)]
        if extra_params:
            params.extend(extra_params)
        tag = self._make_tag(
            name,
            "googtag",
            parameters=params,
            firing_trigger_ids=firing_trigger_ids,
            consent=consent,
        )
        self._tags.append(tag)
        return self

    # Remarketing tag (sp)
    def add_remarketing_tag(
        self,
        name: str = "Google Ads - Remarketing",
        conversion_id: str | None = None,
        firing_trigger_ids: list[str] | None = None,
        *,
        consent: dict | None = None,
    ) -> GTMFactory:
        params = []
        if conversion_id:
            params.append(param("conversionId", conversion_id))
        tag = self._make_tag(
            name,
            "sp",
            parameters=params or None,
            firing_trigger_ids=firing_trigger_ids,
            consent=consent,
        )
        self._tags.append(tag)
        return self

    # Custom HTML tag
    def add_custom_html_tag(
        self,
        name: str = "cHTML - Custom Script",
        html: str = "<script>console.log('test');</script>",
        firing_trigger_ids: list[str] | None = None,
        *,
        consent: dict | None = None,
        notes: str | None = None,
    ) -> GTMFactory:
        params = [
            param("html", html),
            bool_param("supportDocumentWrite", False),
        ]
        tag = self._make_tag(
            name,
            "html",
            parameters=params,
            firing_trigger_ids=firing_trigger_ids,
            consent=consent,
            notes=notes,
        )
        self._tags.append(tag)
        return self

    # Generic tag with arbitrary type
    def add_tag(
        self,
        name: str,
        tag_type: str,
        *,
        parameters: list[dict] | None = None,
        firing_trigger_ids: list[str] | None = None,
        consent: dict | None = None,
        setup_tag: list[dict] | None = None,
        teardown_tag: list[dict] | None = None,
        notes: str | None = None,
        **extra: Any,
    ) -> GTMFactory:
        tag = self._make_tag(
            name,
            tag_type,
            parameters=parameters,
            firing_trigger_ids=firing_trigger_ids,
            consent=consent,
            setup_tag=setup_tag,
            teardown_tag=teardown_tag,
            notes=notes,
            **extra,
        )
        self._tags.append(tag)
        return self

    # -- variable helpers ---------------------------------------------------

    def add_datalayer_variable(
        self,
        name: str,
        datalayer_name: str | None = None,
        *,
        version: str = "2",
    ) -> GTMFactory:
        params = [
            param("dataLayerVersion", version),
        ]
        if datalayer_name:
            params.append(param("name", datalayer_name))
        var: dict[str, Any] = {
            "name": name,
            "type": "v",
            "variableId": _next_variable_id(),
            "parameter": params,
        }
        self._variables.append(var)
        return self

    def add_constant_variable(
        self,
        name: str,
        value: str,
    ) -> GTMFactory:
        var: dict[str, Any] = {
            "name": name,
            "type": "c",
            "variableId": _next_variable_id(),
            "parameter": [param("value", value)],
        }
        self._variables.append(var)
        return self

    def add_javascript_variable(
        self,
        name: str,
        javascript: str = "function(){return '';}",
    ) -> GTMFactory:
        var: dict[str, Any] = {
            "name": name,
            "type": "jsm",
            "variableId": _next_variable_id(),
            "parameter": [param("javascript", javascript)],
        }
        self._variables.append(var)
        return self

    def add_lookup_table_variable(
        self,
        name: str,
    ) -> GTMFactory:
        var: dict[str, Any] = {
            "name": name,
            "type": "smm",
            "variableId": _next_variable_id(),
        }
        self._variables.append(var)
        return self

    def add_variable(
        self,
        name: str,
        var_type: str,
        *,
        parameters: list[dict] | None = None,
    ) -> GTMFactory:
        var: dict[str, Any] = {
            "name": name,
            "type": var_type,
            "variableId": _next_variable_id(),
        }
        if parameters:
            var["parameter"] = parameters
        self._variables.append(var)
        return self

    # -- built-in variable helpers ------------------------------------------

    def add_builtin_variable(
        self,
        name: str,
        var_type: str,
    ) -> GTMFactory:
        self._builtin_variables.append({"name": name, "type": var_type})
        return self

    def add_standard_builtins(self) -> GTMFactory:
        """Add the typical set of built-in variables."""
        builtins = [
            ("Page URL", "PAGE_URL"),
            ("Page Hostname", "PAGE_HOSTNAME"),
            ("Page Path", "PAGE_PATH"),
            ("Referrer", "REFERRER"),
            ("Event", "EVENT"),
        ]
        for name, vtype in builtins:
            self.add_builtin_variable(name, vtype)
        return self

    # -- metadata -----------------------------------------------------------

    def with_metadata(
        self,
        account_id: str = "6005838559",
        container_id: str = "58262010",
        public_id: str = "GTM-TEST123",
        container_name: str = "Test Container",
    ) -> GTMFactory:
        """Add realistic top-level metadata (exportFormatVersion, container, etc.)."""
        self._metadata = {
            "account_id": account_id,
            "container_id": container_id,
            "public_id": public_id,
            "container_name": container_name,
        }
        return self

    # -- build --------------------------------------------------------------

    def build(self) -> dict:
        """
        Return the minimal GTM container dict.

        Shape matches what the TypeScript linter (and future Python
        linter) expects under `containerVersion`.
        """
        container_version: dict[str, Any] = {}

        if self._tags:
            container_version["tag"] = copy.deepcopy(self._tags)
        if self._triggers:
            container_version["trigger"] = copy.deepcopy(self._triggers)
        if self._variables:
            container_version["variable"] = copy.deepcopy(self._variables)
        if self._builtin_variables:
            container_version["builtInVariable"] = copy.deepcopy(
                self._builtin_variables
            )

        result: dict[str, Any] = {"containerVersion": container_version}

        if self._metadata:
            result["exportFormatVersion"] = 2
            result["exportTime"] = "2026-01-01 00:00:00"
            result["containerVersion"]["accountId"] = self._metadata[
                "account_id"
            ]
            result["containerVersion"]["containerId"] = self._metadata[
                "container_id"
            ]
            result["containerVersion"]["container"] = {
                "name": self._metadata["container_name"],
                "publicId": self._metadata["public_id"],
            }

        return result

    def build_json(self) -> str:
        """Return the container as a JSON string (handy for parser tests)."""
        return json.dumps(self.build(), indent=2)

    # -- convenience class methods for common scenarios ---------------------

    @classmethod
    def empty(cls) -> dict:
        """A valid but completely empty container."""
        return cls().build()

    @classmethod
    def clean(cls) -> dict:
        """Minimal healthy container: Linker + GA4 Config on All Pages."""
        return (
            cls()
            .add_pageview_trigger("All Pages", "1")
            .add_init_trigger("Initialization - All Pages", "2")
            .add_conversion_linker(firing_trigger_ids=["1"])
            .add_ga4_config(firing_trigger_ids=["2"])
            .build()
        )

    @classmethod
    def missing_linker(cls) -> dict:
        """Container with GA4 but no Conversion Linker."""
        return (
            cls()
            .add_pageview_trigger("All Pages", "1")
            .add_ga4_config(firing_trigger_ids=["1"])
            .build()
        )

    @classmethod
    def duplicate_conversions(
        cls,
        conversion_id: str = "123456789",
        trigger_id: str = "1",
    ) -> dict:
        """Two awct tags with the same conversionId and trigger."""
        return (
            cls()
            .add_trigger("Form Submit", "formSubmit", trigger_id)
            .add_conversion_tag(
                "Purchase Conversion",
                conversion_id=conversion_id,
                firing_trigger_ids=[trigger_id],
            )
            .add_conversion_tag(
                "Purchase Conversion - Backup",
                conversion_id=conversion_id,
                firing_trigger_ids=[trigger_id],
            )
            .build()
        )

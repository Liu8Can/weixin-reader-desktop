use crate::plugin_manager;
use tauri::{AppHandle, Runtime};

/// 站点配置结构体
/// 用于管理多个阅读网站的配置信息
#[derive(Debug, Clone)]
pub struct SiteConfig {
    /// 站点 ID (用于内部识别)
    pub id: &'static str,
    /// 站点首页 URL
    pub home_url: &'static str,
}

/// 微信读书配置
pub const WEREAD: SiteConfig = SiteConfig {
    id: "weread",
    home_url: "https://weread.qq.com/",
};

/// `enabledPlugins` 缺省表示全部启用，保持旧版设置文件的兼容性。
/// 一旦该列表存在，只有显式列出的在线站点可以被打开或出现在书店菜单中。
pub fn is_site_enabled(settings: &serde_json::Value, site_id: &str) -> bool {
    settings
        .get("global")
        .and_then(|global| global.get("enabledPlugins"))
        .and_then(serde_json::Value::as_array)
        .is_none_or(|ids| ids.iter().any(|value| value.as_str() == Some(site_id)))
}

fn resolve_plugin_home_url(
    plugins: impl IntoIterator<Item = plugin_manager::PluginInfo>,
    site_id: &str,
) -> Option<String> {
    plugins
        .into_iter()
        .find(|plugin| plugin.id == site_id)
        .and_then(|plugin| plugin.site.map(|site| site.home_url))
}

/// 根据 siteId 解析站点首页 URL
/// - 内置站点 weread 直接返回常量
/// - 其它 id 从已安装外部插件的 manifest.site.home_url 匹配获取
///
/// 返回 None 表示未找到该站点
pub fn resolve_home_url<R: Runtime>(app: &AppHandle<R>, site_id: &str) -> Option<String> {
    if site_id == WEREAD.id {
        return Some(WEREAD.home_url.to_string());
    }
    plugin_manager::get_installed_plugins(app)
        .ok()
        .and_then(|plugins| resolve_plugin_home_url(plugins, site_id))
}

fn host_matches_domain(host: &str, domain: &str) -> bool {
    let host = host.trim_end_matches('.').to_ascii_lowercase();
    let domain = domain
        .trim()
        .trim_start_matches('.')
        .trim_end_matches('.')
        .to_ascii_lowercase();
    host == domain || host.ends_with(&format!(".{domain}"))
}

/// 原生端对阅读页的最小权威判定。前端可报告更细能力，但不能把首页或未知域名
/// 自行升级成阅读上下文。
pub fn is_reader_url<R: Runtime>(app: &AppHandle<R>, url: &tauri::Url) -> bool {
    if url.scheme() == "atreader" || url.host_str() == Some("atreader.localhost") {
        return url.path() == "/local-reader";
    }
    let Some(host) = url.host_str() else {
        return false;
    };
    if host_matches_domain(host, "weread.qq.com") {
        return url.path().contains("/web/reader/");
    }
    plugin_manager::get_installed_plugins(app)
        .unwrap_or_default()
        .into_iter()
        .filter_map(|plugin| plugin.site)
        .any(|site| {
            let domain_matches = match site.domain {
                serde_json::Value::String(domain) => host_matches_domain(host, &domain),
                serde_json::Value::Array(domains) => domains.iter().any(|domain| {
                    domain
                        .as_str()
                        .is_some_and(|domain| host_matches_domain(host, domain))
                }),
                _ => false,
            };
            domain_matches && url.path().contains(&site.reader_pattern)
        })
}

pub fn reader_action_supported<R: Runtime>(
    app: &AppHandle<R>,
    url: &tauri::Url,
    action: &str,
) -> bool {
    if !is_reader_url(app, url) {
        return false;
    }
    let Some(host) = url.host_str() else {
        // 自定义协议本地阅读器的能力由内置 manifest 固定提供。
        return true;
    };
    if host == "atreader.localhost" || host_matches_domain(host, "weread.qq.com") {
        return true;
    }
    let capability = match action {
        "reader_wide" => Some("wideMode"),
        "hide_toolbar" => Some("hideToolbar"),
        "hide_navbar" => Some("hideNavbar"),
        "hide_cursor" => Some("hideCursor"),
        "auto_flip" => Some("autoFlip"),
        "reader_prev_chapter" | "reader_next_chapter" => Some("chapterNav"),
        "reader_prev_page" | "reader_next_page" | "reader_style" => None,
        _ => return false,
    };
    let Some(capability) = capability else {
        return true;
    };
    plugin_manager::get_installed_plugins(app)
        .unwrap_or_default()
        .into_iter()
        .find(|plugin| {
            plugin.site.as_ref().is_some_and(|site| match &site.domain {
                serde_json::Value::String(domain) => host_matches_domain(host, domain),
                serde_json::Value::Array(domains) => domains.iter().any(|domain| {
                    domain
                        .as_str()
                        .is_some_and(|domain| host_matches_domain(host, domain))
                }),
                _ => false,
            })
        })
        .and_then(|plugin| plugin.capabilities)
        .and_then(|capabilities| {
            capabilities
                .get(capability)
                .and_then(serde_json::Value::as_bool)
        })
        == Some(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn plugin(id: &str, home_url: &str, with_site: bool) -> plugin_manager::PluginInfo {
        plugin_manager::PluginInfo {
            id: id.to_string(),
            name: id.to_string(),
            version: "1.0.0".to_string(),
            description: None,
            author: None,
            homepage: None,
            icon: None,
            source_type: "web".to_string(),
            site: with_site.then(|| plugin_manager::PluginSiteConfig {
                domain: json!("example.com"),
                home_url: home_url.to_string(),
                reader_pattern: "/reader/".to_string(),
            }),
            capabilities: None,
            config_schema: None,
            builtin: false,
            enabled: true,
        }
    }

    #[test]
    fn built_in_site_contract_is_stable() {
        assert_eq!(WEREAD.id, "weread");
        assert_eq!(WEREAD.home_url, "https://weread.qq.com/");
    }

    #[test]
    fn enabled_site_list_is_opt_in_only_when_present() {
        assert!(is_site_enabled(&json!({}), "weread"));
        let settings = json!({ "global": { "enabledPlugins": ["fanqie"] } });
        assert!(!is_site_enabled(&settings, "weread"));
        assert!(is_site_enabled(&settings, "fanqie"));
    }

    #[test]
    fn plugin_home_resolution_selects_exact_id_and_requires_site_data() {
        let plugins = vec![
            plugin("first", "https://first.example/", true),
            plugin("without-site", "https://unused.example/", false),
            plugin("second", "https://second.example/", true),
        ];
        assert_eq!(
            resolve_plugin_home_url(plugins.clone(), "second"),
            Some("https://second.example/".to_string())
        );
        assert_eq!(
            resolve_plugin_home_url(plugins.clone(), "without-site"),
            None
        );
        assert_eq!(resolve_plugin_home_url(plugins, "missing"), None);
    }

    #[test]
    fn domain_matching_accepts_subdomains_but_rejects_confusable_suffixes() {
        assert!(host_matches_domain("weread.qq.com", "weread.qq.com"));
        assert!(host_matches_domain("book.weread.qq.com", "weread.qq.com"));
        assert!(host_matches_domain("BOOK.EXAMPLE.COM.", ".example.com"));
        assert!(!host_matches_domain("evilweread.qq.com", "weread.qq.com"));
        assert!(!host_matches_domain(
            "weread.qq.com.evil.test",
            "weread.qq.com"
        ));
    }
}

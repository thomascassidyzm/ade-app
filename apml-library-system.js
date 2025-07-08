/**
 * APML Library System - Comprehensive library of reusable APML components
 * Delivered via WebSocket to L1_ORCH, no complex persistence needed
 */

class APMLLibrarySystem {
  constructor() {
    this.libraryVersion = "1.0.0";
    this.components = this.initializeComponentLibrary();
    this.templates = this.initializeTemplateLibrary();
    this.patterns = this.initializePatternLibrary();
  }

  initializeComponentLibrary() {
    return {
      // Authentication Components
      auth: {
        login_flow: {
          name: "Standard Login Flow",
          description: "Email/password login with validation",
          apml: {
            screens: ["login", "forgot_password", "reset_password"],
            flows: {
              login: {
                steps: [
                  { type: "user_action", action: "input_email" },
                  { type: "user_action", action: "input_password" },
                  { type: "user_action", action: "tap_login" },
                  { type: "data_flow", action: "validate_credentials" },
                  { type: "system_response", action: "navigate_home", condition: "success" },
                  { type: "system_response", action: "show_error", condition: "failure" }
                ]
              }
            }
          }
        },
        social_login: {
          name: "Social Auth Flow",
          description: "OAuth login with Google, Facebook, Apple",
          apml: {
            integrations: ["google_oauth", "facebook_oauth", "apple_signin"],
            flows: {
              social_auth: {
                steps: [
                  { type: "user_action", action: "tap_social_button" },
                  { type: "system_response", action: "open_oauth_webview" },
                  { type: "data_flow", action: "exchange_oauth_token" },
                  { type: "data_flow", action: "create_user_session" }
                ]
              }
            }
          }
        },
        biometric_auth: {
          name: "Biometric Authentication",
          description: "FaceID/TouchID for secure access",
          apml: {
            permissions: ["biometric_auth"],
            flows: {
              biometric_login: {
                steps: [
                  { type: "system_response", action: "prompt_biometric" },
                  { type: "user_action", action: "scan_biometric" },
                  { type: "data_flow", action: "verify_biometric" },
                  { type: "system_response", action: "grant_access" }
                ]
              }
            }
          }
        }
      },

      // Navigation Patterns
      navigation: {
        tab_navigation: {
          name: "Bottom Tab Navigation",
          description: "Standard mobile bottom tabs",
          apml: {
            ui_components: ["tab_bar", "tab_item"],
            structure: {
              tabs: ["home", "search", "profile", "settings"],
              default_tab: "home"
            }
          }
        },
        drawer_navigation: {
          name: "Side Drawer Menu",
          description: "Hamburger menu with slide-out drawer",
          apml: {
            ui_components: ["drawer", "menu_item", "hamburger_button"],
            structure: {
              menu_items: ["home", "categories", "favorites", "settings", "logout"]
            }
          }
        }
      },

      // Data Components
      data_patterns: {
        infinite_scroll: {
          name: "Infinite Scroll List",
          description: "Paginated list with auto-loading",
          apml: {
            flows: {
              load_more: {
                trigger: "scroll_near_bottom",
                steps: [
                  { type: "system_response", action: "show_loading_indicator" },
                  { type: "data_flow", action: "fetch_next_page" },
                  { type: "system_response", action: "append_items" }
                ]
              }
            }
          }
        },
        pull_to_refresh: {
          name: "Pull to Refresh",
          description: "Swipe down to refresh content",
          apml: {
            flows: {
              refresh: {
                trigger: "pull_down_gesture",
                steps: [
                  { type: "system_response", action: "show_refresh_indicator" },
                  { type: "data_flow", action: "fetch_latest_data" },
                  { type: "system_response", action: "update_list" }
                ]
              }
            }
          }
        },
        offline_sync: {
          name: "Offline Data Sync",
          description: "Queue changes for sync when online",
          apml: {
            data_models: {
              sync_queue: {
                id: "uuid",
                action: "enum[create|update|delete]",
                payload: "json",
                timestamp: "datetime"
              }
            },
            flows: {
              queue_offline: {
                trigger: "network_offline",
                steps: [
                  { type: "data_flow", action: "save_to_queue" },
                  { type: "system_response", action: "show_offline_indicator" }
                ]
              },
              sync_online: {
                trigger: "network_restored",
                steps: [
                  { type: "data_flow", action: "process_sync_queue" },
                  { type: "system_response", action: "update_ui_optimistically" }
                ]
              }
            }
          }
        }
      },

      // UI Patterns
      ui_patterns: {
        form_validation: {
          name: "Smart Form Validation",
          description: "Real-time validation with helpful errors",
          apml: {
            validation_rules: {
              email: "valid_email_format",
              password: "min_length:8,has_uppercase,has_number",
              phone: "valid_phone_format"
            },
            flows: {
              validate_field: {
                trigger: "field_blur",
                steps: [
                  { type: "data_flow", action: "run_validation" },
                  { type: "system_response", action: "show_error", condition: "invalid" },
                  { type: "system_response", action: "show_success", condition: "valid" }
                ]
              }
            }
          }
        },
        search_autocomplete: {
          name: "Search with Autocomplete",
          description: "Debounced search with suggestions",
          apml: {
            flows: {
              search: {
                trigger: "text_input",
                debounce: 300,
                steps: [
                  { type: "data_flow", action: "fetch_suggestions" },
                  { type: "system_response", action: "show_suggestions_dropdown" }
                ]
              }
            }
          }
        },
        image_gallery: {
          name: "Swipeable Image Gallery", 
          description: "Full-screen image viewer with gestures",
          apml: {
            ui_components: ["image_viewer", "thumbnail_strip"],
            gestures: ["swipe_horizontal", "pinch_zoom", "double_tap_zoom"],
            flows: {
              view_image: {
                steps: [
                  { type: "user_action", action: "tap_thumbnail" },
                  { type: "system_response", action: "show_fullscreen_gallery" }
                ]
              }
            }
          }
        }
      },

      // Business Logic
      business_features: {
        shopping_cart: {
          name: "Shopping Cart Logic",
          description: "Add to cart, quantity, checkout",
          apml: {
            data_models: {
              cart_item: {
                product_id: "uuid",
                quantity: "integer",
                price: "decimal",
                selected_options: "json"
              }
            },
            flows: {
              add_to_cart: {
                steps: [
                  { type: "user_action", action: "tap_add_to_cart" },
                  { type: "data_flow", action: "check_inventory" },
                  { type: "data_flow", action: "add_item_to_cart" },
                  { type: "system_response", action: "show_cart_animation" },
                  { type: "system_response", action: "update_cart_badge" }
                ]
              }
            }
          }
        },
        chat_messaging: {
          name: "Real-time Chat",
          description: "WebSocket-based messaging",
          apml: {
            connections: ["websocket"],
            data_models: {
              message: {
                id: "uuid",
                from_user: "uuid",
                content: "text",
                timestamp: "datetime",
                read: "boolean"
              }
            },
            flows: {
              send_message: {
                steps: [
                  { type: "user_action", action: "type_message" },
                  { type: "user_action", action: "tap_send" },
                  { type: "system_response", action: "show_sending_indicator" },
                  { type: "data_flow", action: "send_via_websocket" },
                  { type: "system_response", action: "update_chat_ui" }
                ]
              }
            }
          }
        },
        notifications: {
          name: "Push Notifications",
          description: "Local and remote notifications",
          apml: {
            permissions: ["push_notifications"],
            flows: {
              register_device: {
                steps: [
                  { type: "system_response", action: "request_notification_permission" },
                  { type: "user_action", action: "grant_permission" },
                  { type: "data_flow", action: "register_device_token" }
                ]
              },
              handle_notification: {
                steps: [
                  { type: "system_response", action: "receive_notification" },
                  { type: "system_response", action: "show_notification_banner" },
                  { type: "user_action", action: "tap_notification" },
                  { type: "system_response", action: "navigate_to_content" }
                ]
              }
            }
          }
        }
      }
    };
  }

  initializeTemplateLibrary() {
    return {
      todo_app: {
        name: "Todo List App",
        description: "Complete task management application",
        components: ["auth/login_flow", "data_patterns/offline_sync", "ui_patterns/form_validation"],
        base_spec: {
          app_meta: {
            name: "TodoMaster",
            platform: "mobile-first"
          },
          screens: ["task_list", "task_detail", "categories", "settings"],
          features: ["create_task", "complete_task", "categorize", "set_reminders"]
        }
      },
      social_app: {
        name: "Social Media App",
        description: "Feed-based social application",
        components: [
          "auth/social_login",
          "navigation/tab_navigation", 
          "data_patterns/infinite_scroll",
          "business_features/chat_messaging",
          "ui_patterns/image_gallery"
        ],
        base_spec: {
          app_meta: {
            name: "SocialConnect",
            platform: "mobile-first"
          },
          screens: ["feed", "discover", "create_post", "profile", "messages"]
        }
      },
      ecommerce_app: {
        name: "E-commerce App",
        description: "Shopping application with cart and checkout",
        components: [
          "auth/login_flow",
          "business_features/shopping_cart",
          "ui_patterns/search_autocomplete",
          "data_patterns/infinite_scroll"
        ],
        base_spec: {
          app_meta: {
            name: "ShopEasy",
            platform: "mobile-first"
          },
          screens: ["home", "categories", "product_detail", "cart", "checkout"]
        }
      }
    };
  }

  initializePatternLibrary() {
    return {
      mobile_first: {
        principles: [
          "Touch targets minimum 44x44 points",
          "Thumb-friendly navigation zones",
          "Gesture-based interactions",
          "Offline-first architecture"
        ]
      },
      accessibility: {
        requirements: [
          "Screen reader compatibility",
          "Color contrast ratios",
          "Focus indicators",
          "Alternative text for images"
        ]
      },
      performance: {
        optimizations: [
          "Lazy loading for images",
          "Code splitting by route",
          "Optimistic UI updates",
          "Debounced API calls"
        ]
      }
    };
  }

  // Get component by path (e.g., "auth/login_flow")
  getComponent(path) {
    const [category, name] = path.split('/');
    return this.components[category]?.[name];
  }

  // Get all components in a category
  getCategory(category) {
    return this.components[category] || {};
  }

  // Build complete spec from template
  buildFromTemplate(templateName, customizations = {}) {
    const template = this.templates[templateName];
    if (!template) throw new Error(`Template ${templateName} not found`);

    let spec = { ...template.base_spec, ...customizations };
    
    // Merge in all component specs
    template.components.forEach(componentPath => {
      const component = this.getComponent(componentPath);
      if (component?.apml) {
        spec = this.mergeSpecs(spec, component.apml);
      }
    });

    return spec;
  }

  // Merge APML specs intelligently
  mergeSpecs(base, addition) {
    const merged = { ...base };
    
    // Merge arrays by concatenating unique values
    ['screens', 'permissions', 'integrations'].forEach(key => {
      if (addition[key]) {
        merged[key] = [...new Set([...(base[key] || []), ...addition[key]])];
      }
    });
    
    // Merge objects deeply
    ['flows', 'data_models', 'ui_components'].forEach(key => {
      if (addition[key]) {
        merged[key] = { ...(base[key] || {}), ...addition[key] };
      }
    });
    
    return merged;
  }

  // Format library as APML message for L1_ORCH
  formatAsAPMLMessage() {
    return {
      apml: '1.0',
      type: 'library_catalog',
      from: 'ADE_LIBRARY',
      to: 'L1_ORCH',
      timestamp: new Date().toISOString(),
      content: {
        library_version: this.libraryVersion,
        categories: Object.keys(this.components),
        templates: Object.keys(this.templates),
        total_components: this.countComponents(),
        message: "Full APML component library loaded. Use getComponent(path) to access."
      },
      _embedded_library: this // Include the actual library object
    };
  }

  countComponents() {
    return Object.values(this.components).reduce((sum, category) => 
      sum + Object.keys(category).length, 0
    );
  }

  // Search components by keyword
  searchComponents(keyword) {
    const results = [];
    const searchTerm = keyword.toLowerCase();
    
    Object.entries(this.components).forEach(([category, components]) => {
      Object.entries(components).forEach(([name, component]) => {
        if (name.includes(searchTerm) || 
            component.description.toLowerCase().includes(searchTerm)) {
          results.push({
            path: `${category}/${name}`,
            component
          });
        }
      });
    });
    
    return results;
  }

  // AI-powered component suggestions based on app description
  getSuggestionsForApp(description) {
    const suggestions = [];
    const desc = description.toLowerCase();
    
    // Auth suggestions
    if (desc.includes('professional') || desc.includes('business') || desc.includes('team')) {
      suggestions.push('auth/login_flow');
    } else if (desc.includes('quick') || desc.includes('simple')) {
      suggestions.push('auth/social_login');
    }
    
    // Feature suggestions
    if (desc.includes('social') || desc.includes('community') || desc.includes('share')) {
      suggestions.push('auth/social_login', 'business_features/chat_messaging', 'ui_patterns/image_gallery');
    }
    
    if (desc.includes('shop') || desc.includes('buy') || desc.includes('sell') || desc.includes('commerce')) {
      suggestions.push('business_features/shopping_cart', 'ui_patterns/search_autocomplete', 'data_patterns/infinite_scroll');
    }
    
    if (desc.includes('task') || desc.includes('todo') || desc.includes('project')) {
      suggestions.push('ui_patterns/form_validation', 'data_patterns/offline_sync', 'business_features/notifications');
    }
    
    if (desc.includes('chat') || desc.includes('message') || desc.includes('talk')) {
      suggestions.push('business_features/chat_messaging', 'business_features/notifications');
    }
    
    // Always suggest essentials
    suggestions.push('navigation/tab_navigation', 'ui_patterns/form_validation');
    
    // Return unique suggestions with estimated build time
    const unique = [...new Set(suggestions)];
    return unique.map(path => ({
      path,
      component: this.getComponent(path),
      estimatedMinutes: Math.floor(Math.random() * 3) + 2 // 2-5 minutes per component
    }));
  }

  // Get build time estimate for selected components
  estimateBuildTime(componentPaths) {
    // Base time: 5 minutes for setup
    let totalMinutes = 5;
    
    // Add time for each component (2-5 minutes each)
    totalMinutes += componentPaths.length * 3;
    
    // Add integration time
    if (componentPaths.length > 5) {
      totalMinutes += 10; // Complex integration
    } else if (componentPaths.length > 3) {
      totalMinutes += 5; // Medium integration
    }
    
    return {
      minutes: totalMinutes,
      formatted: totalMinutes < 60 ? `${totalMinutes} minutes` : `${Math.floor(totalMinutes/60)} hours ${totalMinutes%60} minutes`
    };
  }
}

module.exports = APMLLibrarySystem;
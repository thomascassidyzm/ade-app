/**
 * APML Capability Library - Sophisticated components for original apps
 * Not templates - but powerful building blocks that handle complex integrations
 */

class APMLCapabilityLibrary {
  constructor() {
    this.version = "2.0.0";
    this.capabilities = this.initializeCapabilities();
  }

  initializeCapabilities() {
    return {
      // 🎤 VOICE & SPEECH
      voice: {
        voice_recognition: {
          name: "Voice Recognition & Commands",
          description: "Complete voice interface with multiple providers",
          providers: ["openai_whisper", "google_speech", "aws_transcribe", "deepgram"],
          apml: {
            config: {
              api_key_required: true,
              one_click_setup: true
            },
            features: [
              "real_time_transcription",
              "voice_commands",
              "multi_language",
              "noise_cancellation",
              "speaker_diarization"
            ],
            flows: {
              voice_input: {
                steps: [
                  { type: "user_action", action: "tap_mic_button" },
                  { type: "system_response", action: "request_mic_permission", fallback: "show_text_input" },
                  { type: "data_flow", action: "stream_audio_to_api" },
                  { type: "system_response", action: "show_live_transcription" },
                  { type: "data_flow", action: "process_voice_command" }
                ]
              }
            },
            error_handling: [
              "network_failure_queuing",
              "api_limit_fallback",
              "offline_mode_cache"
            ]
          },
          setup_time: "30 seconds with API key",
          normally_takes: "2-3 weeks to implement properly"
        },

        text_to_speech: {
          name: "Natural Text-to-Speech",
          description: "AI voices for app narration, accessibility",
          providers: ["elevenlabs", "aws_polly", "google_tts", "azure_cognitive"],
          features: [
            "voice_cloning",
            "emotion_control",
            "speed_adjustment",
            "multiple_voices",
            "ssml_support"
          ],
          use_cases: [
            "app_tutorials",
            "accessibility",
            "audiobook_apps",
            "voice_assistants"
          ]
        }
      },

      // 💳 PAYMENT FLOWS
      payments: {
        one_click_purchase: {
          name: "Amazon-Style 1-Click Purchase",
          description: "Frictionless payment with saved cards - the holy grail of conversion",
          providers: ["stripe", "square", "paypal", "apple_pay", "google_pay"],
          apml: {
            compliance: ["pci_dss", "sca", "gdpr"],
            features: [
              "saved_payment_methods",
              "biometric_confirmation", 
              "instant_checkout",
              "subscription_support",
              "multi_currency"
            ],
            flows: {
              one_click_buy: {
                steps: [
                  { type: "user_action", action: "tap_buy_now" },
                  { type: "system_response", action: "show_price_confirmation" },
                  { type: "user_action", action: "confirm_biometric" },
                  { type: "data_flow", action: "charge_saved_card" },
                  { type: "system_response", action: "instant_success_feedback" }
                ]
              }
            },
            security: [
              "tokenization",
              "3d_secure", 
              "fraud_detection",
              "chargeback_protection"
            ],
            conversion_impact: "Increases conversion by 30-50% vs traditional checkout"
          },
          setup_process: {
            step1: "Add Stripe/Square API key",
            step2: "Enable payment element",
            step3: "Configure webhook for confirmations",
            time: "1 hour total"
          },
          what_it_handles: [
            "Payment method storage (PCI compliant)",
            "Failed payment retry logic",
            "Currency conversion",
            "Tax calculation",
            "Subscription upgrades/downgrades",
            "Refunds and disputes"
          ],
          normally_takes: "4-6 weeks with compliance",
          real_world_example: "Amazon processes $1.29 billion per day with 1-click"
        },

        subscription_billing: {
          name: "Complete Subscription Management",
          description: "Netflix-style recurring billing with trials",
          features: [
            "free_trials",
            "plan_switching",
            "usage_based_billing",
            "dunning_management",
            "invoice_generation"
          ],
          handles: [
            "payment_failures",
            "card_updates",
            "proration",
            "tax_calculation"
          ]
        }
      },

      // 🤖 AI INTEGRATIONS
      ai_capabilities: {
        llm_integration: {
          name: "LLM-Powered Features",
          description: "ChatGPT/Claude/Gemini integration",
          providers: ["openai", "anthropic", "google_ai", "cohere", "local_llama"],
          apml: {
            features: [
              "conversational_ui",
              "content_generation",
              "code_assistance",
              "translation",
              "summarization"
            ],
            patterns: [
              "streaming_responses",
              "token_management",
              "context_windows",
              "rate_limiting",
              "fallback_providers"
            ],
            flows: {
              ai_chat: {
                steps: [
                  { type: "user_action", action: "type_message" },
                  { type: "data_flow", action: "send_to_llm_api" },
                  { type: "system_response", action: "stream_response_tokens" },
                  { type: "data_flow", action: "update_conversation_history" }
                ]
              }
            }
          },
          setup_time: "5 minutes with API key",
          normally_takes: "1-2 weeks for production-ready"
        },

        computer_vision: {
          name: "Image Recognition & Analysis",
          description: "Object detection, OCR, face recognition",
          providers: ["google_vision", "aws_rekognition", "azure_vision", "clarifai"],
          capabilities: [
            "object_detection",
            "text_extraction",
            "face_detection",
            "image_moderation",
            "custom_model_training"
          ],
          use_cases: [
            "receipt_scanning",
            "id_verification",
            "product_search",
            "accessibility_features"
          ]
        },

        ai_search: {
          name: "Semantic Search & RAG",
          description: "AI-powered search with embeddings",
          providers: ["pinecone", "weaviate", "qdrant", "elasticsearch"],
          features: [
            "vector_search",
            "hybrid_search",
            "multi_modal_search",
            "personalization",
            "auto_complete"
          ]
        }
      },

      // 🔐 ADVANCED AUTH
      advanced_auth: {
        passwordless: {
          name: "Magic Link & Passkeys",
          description: "Modern passwordless authentication",
          methods: ["magic_link", "webauthn", "passkeys", "qr_code"],
          apml: {
            flows: {
              magic_link: {
                steps: [
                  { type: "user_action", action: "enter_email" },
                  { type: "data_flow", action: "generate_secure_token" },
                  { type: "data_flow", action: "send_email" },
                  { type: "user_action", action: "click_email_link" },
                  { type: "system_response", action: "auto_login" }
                ]
              }
            },
            security: [
              "time_limited_tokens",
              "single_use_links",
              "device_fingerprinting",
              "ip_validation"
            ]
          }
        },

        enterprise_sso: {
          name: "Enterprise SSO Integration",
          description: "SAML/OAuth for corporate clients",
          protocols: ["saml_2.0", "oauth_2.0", "openid_connect", "active_directory"],
          providers: ["okta", "auth0", "azure_ad", "google_workspace"],
          features: [
            "auto_provisioning",
            "role_mapping",
            "mfa_enforcement",
            "session_management"
          ]
        }
      },

      // 📡 REAL-TIME FEATURES
      realtime: {
        websocket_infrastructure: {
          name: "Scalable WebSocket System",
          description: "Real-time updates that scale to millions",
          providers: ["pusher", "ably", "aws_appsync", "firebase_realtime"],
          apml: {
            features: [
              "auto_reconnection",
              "presence_detection",
              "channel_management",
              "message_history",
              "guaranteed_delivery"
            ],
            patterns: [
              "optimistic_updates",
              "conflict_resolution",
              "offline_queue",
              "binary_protocols"
            ]
          },
          setup_time: "20 minutes with service key",
          normally_takes: "3-4 weeks for reliable implementation"
        },

        live_collaboration: {
          name: "Google Docs-Style Collaboration",
          description: "Real-time collaborative editing",
          features: [
            "operational_transform",
            "cursor_positions",
            "user_awareness",
            "conflict_free_replicated_data",
            "version_history"
          ],
          providers: ["yjs", "sharedb", "liveblocks", "firebase"]
        }
      },

      // 🌍 LOCATION & MAPS
      location: {
        advanced_mapping: {
          name: "Uber-Style Map Features",
          description: "Real-time tracking, routing, geofencing",
          providers: ["mapbox", "google_maps", "here", "apple_mapkit"],
          features: [
            "live_location_tracking",
            "route_optimization",
            "geofencing",
            "offline_maps",
            "custom_markers"
          ],
          apml: {
            permissions: ["location_always", "location_when_in_use"],
            flows: {
              live_tracking: {
                steps: [
                  { type: "system_response", action: "request_location_permission" },
                  { type: "data_flow", action: "start_location_updates" },
                  { type: "system_response", action: "update_map_marker" },
                  { type: "data_flow", action: "broadcast_location_to_others" }
                ]
              }
            }
          }
        }
      },

      // 📊 ANALYTICS & MONITORING
      analytics: {
        product_analytics: {
          name: "Complete Analytics Stack",
          description: "User behavior, funnels, retention",
          providers: ["mixpanel", "amplitude", "segment", "posthog"],
          features: [
            "auto_event_tracking",
            "user_journeys",
            "cohort_analysis",
            "a_b_testing",
            "revenue_tracking"
          ],
          setup_time: "15 minutes with SDK key",
          normally_takes: "1-2 weeks to instrument properly"
        },

        error_monitoring: {
          name: "Production Error Tracking",
          description: "Sentry-style error monitoring",
          providers: ["sentry", "bugsnag", "rollbar", "crashlytics"],
          features: [
            "automatic_error_capture",
            "user_context",
            "release_tracking",
            "performance_monitoring",
            "custom_alerts"
          ]
        }
      },

      // 🔔 ADVANCED NOTIFICATIONS
      notifications: {
        smart_notifications: {
          name: "Intelligent Notification System",
          description: "Multi-channel, preference-based, batched",
          channels: ["push", "email", "sms", "in_app", "webhook"],
          features: [
            "user_preferences",
            "quiet_hours",
            "batching_logic",
            "priority_levels",
            "deep_linking"
          ],
          providers: ["onesignal", "firebase_messaging", "twilio", "sendgrid"]
        }
      },

      // 🎥 MEDIA HANDLING
      media: {
        video_processing: {
          name: "TikTok-Style Video Features",
          description: "Upload, transcode, stream, effects",
          providers: ["mux", "cloudflare_stream", "aws_mediaconvert", "api_video"],
          features: [
            "adaptive_streaming",
            "thumbnail_generation",
            "filters_effects",
            "trimming_editing",
            "live_streaming"
          ],
          setup_time: "30 minutes with API key",
          normally_takes: "6-8 weeks for video infrastructure"
        }
      }
    };
  }

  // Get capabilities for an innovative app idea
  suggestCapabilities(appDescription) {
    const suggestions = [];
    const desc = appDescription.toLowerCase();
    
    // Voice-first apps
    if (desc.includes('voice') || desc.includes('speak') || desc.includes('talk')) {
      suggestions.push({
        capability: 'voice/voice_recognition',
        reason: 'Enable natural voice interactions',
        impact: 'Save 2-3 weeks of implementation'
      });
    }
    
    // Apps with transactions
    if (desc.includes('buy') || desc.includes('purchase') || desc.includes('pay')) {
      suggestions.push({
        capability: 'payments/one_click_purchase',
        reason: 'Frictionless payment experience',
        impact: 'Save 4-6 weeks including compliance'
      });
    }
    
    // AI-powered apps
    if (desc.includes('ai') || desc.includes('smart') || desc.includes('intelligent')) {
      suggestions.push({
        capability: 'ai_capabilities/llm_integration',
        reason: 'Add conversational AI features',
        impact: 'Save 1-2 weeks of API integration'
      });
    }
    
    // Real-time apps
    if (desc.includes('live') || desc.includes('real-time') || desc.includes('collaborative')) {
      suggestions.push({
        capability: 'realtime/websocket_infrastructure',
        reason: 'Scalable real-time updates',
        impact: 'Save 3-4 weeks of infrastructure work'
      });
    }
    
    return suggestions;
  }
  
  getProcessLibraries() {
    return {
      // 🔐 AUTHENTICATION FLOWS
      auth_flows: {
        complete_auth_system: {
          name: "Complete Authentication System",
          description: "Production-ready auth with all edge cases handled",
          time_saved: "4-6 weeks",
          includes: [
            "signup_with_verification",
            "login_with_2fa",
            "forgot_password",
            "change_password",
            "social_logins",
            "session_management",
            "device_tracking"
          ],
          apml_flow: {
            signup: {
              steps: [
                { action: "validate_email_format", error_handling: "inline_validation" },
                { action: "check_existing_user", error_handling: "suggest_login" },
                { action: "create_user_account", rollback: true },
                { action: "send_verification_email", retry: 3 },
                { action: "show_verification_pending_ui" },
                { action: "handle_email_verification", timeout: "24_hours" }
              ]
            },
            forgot_password: {
              steps: [
                { action: "validate_email", security: "rate_limit_by_ip" },
                { action: "generate_reset_token", expiry: "1_hour" },
                { action: "send_reset_email", template: "password_reset" },
                { action: "validate_reset_token" },
                { action: "accept_new_password", requirements: "configurable" },
                { action: "invalidate_all_sessions", notify: true }
              ]
            }
          }
        },
        
        family_accounts: {
          name: "Family/Multi-Profile System",
          description: "Netflix-style profile switching under one account",
          time_saved: "3-4 weeks",
          features: [
            "parent_account_management",
            "child_profiles_with_restrictions",
            "profile_switching_ui",
            "content_filtering_by_profile",
            "usage_tracking_per_profile",
            "parental_controls"
          ],
          apml_flow: {
            profile_management: {
              max_profiles: 5,
              profile_types: ["adult", "teen", "child"],
              switching: "pin_protected_optional",
              data_isolation: "profile_scoped",
              shared_data: ["subscription", "payment_method"]
            }
          }
        }
      },
      
      // 👤 USER MANAGEMENT
      user_management: {
        profile_management: {
          name: "Complete User Profile System",
          description: "Everything users need to manage their account",
          time_saved: "2-3 weeks",
          includes: [
            "change_email_with_verification",
            "change_display_name",
            "avatar_upload_with_crop",
            "timezone_preferences",
            "notification_settings",
            "privacy_controls",
            "data_export_gdpr"
          ],
          apml_flow: {
            change_email: {
              steps: [
                { action: "verify_current_password" },
                { action: "validate_new_email" },
                { action: "send_verification_to_new" },
                { action: "maintain_old_email_active" },
                { action: "confirm_new_email" },
                { action: "update_all_references" },
                { action: "notify_both_emails" }
              ]
            }
          }
        },
        
        account_deletion: {
          name: "GDPR-Compliant Account Deletion",
          description: "Proper account deletion with data retention policies",
          time_saved: "1-2 weeks",
          features: [
            "soft_delete_with_grace_period",
            "data_export_before_deletion",
            "cascade_deletion_rules",
            "regulatory_compliance",
            "reactivation_window"
          ]
        }
      },
      
      // 📧 COMMUNICATION FLOWS
      communication: {
        notification_system: {
          name: "Multi-Channel Notification System",
          description: "In-app, email, SMS, and push notifications",
          time_saved: "3-4 weeks",
          channels: {
            in_app: {
              features: ["real_time_updates", "notification_center", "mark_as_read", "categories"]
            },
            email: {
              features: ["templates", "unsubscribe_management", "bounce_handling", "tracking"]
            },
            push: {
              features: ["ios_apns", "android_fcm", "web_push", "rich_notifications"]
            },
            sms: {
              features: ["twilio_integration", "opt_in_management", "delivery_tracking"]
            }
          },
          user_preferences: {
            granular_controls: true,
            channel_preferences: "per_notification_type",
            quiet_hours: true,
            digest_options: ["immediate", "hourly", "daily", "weekly"]
          }
        }
      },
      
      // 💳 SUBSCRIPTION MANAGEMENT
      subscriptions: {
        complete_subscription_flow: {
          name: "SaaS Subscription Management",
          description: "Complete subscription lifecycle management",
          time_saved: "4-5 weeks",
          includes: [
            "plan_selection_ui",
            "trial_period_management",
            "upgrade_downgrade_flows",
            "payment_failure_handling",
            "dunning_management",
            "cancellation_flow",
            "win_back_campaigns"
          ],
          apml_flow: {
            trial_to_paid: {
              steps: [
                { action: "trial_expiry_warnings", schedule: [-7, -3, -1, 0] },
                { action: "capture_payment_method", timing: "optional_during_trial" },
                { action: "auto_convert_or_downgrade", based_on: "user_settings" },
                { action: "usage_based_upgrade_prompts" }
              ]
            },
            payment_failure: {
              retry_schedule: [1, 3, 5, 7],
              user_notifications: ["email", "in_app_banner"],
              grace_period: 7,
              service_degradation: "configurable"
            }
          }
        }
      },
      
      // 🎮 GAMIFICATION
      gamification: {
        achievement_system: {
          name: "Complete Achievement/Badge System",
          description: "Engagement through gamification",
          time_saved: "2-3 weeks",
          includes: [
            "achievement_definitions",
            "progress_tracking",
            "badge_unlocking_ui",
            "leaderboards",
            "streak_tracking",
            "milestone_rewards"
          ],
          features: {
            achievement_types: ["one_time", "cumulative", "streak", "milestone"],
            notification: "celebratory_animation",
            sharing: ["social_media", "in_app_feed"],
            retroactive: true
          }
        }
      },
      
      // 🔍 SEARCH & DISCOVERY
      search: {
        advanced_search: {
          name: "Full-Text Search with Filters",
          description: "Google-quality search experience",
          time_saved: "3-4 weeks",
          includes: [
            "instant_search_suggestions",
            "search_history",
            "saved_searches",
            "filter_combinations",
            "search_analytics",
            "did_you_mean",
            "no_results_handling"
          ],
          technical: {
            backends: ["elasticsearch", "algolia", "typesense", "meilisearch"],
            features: ["typo_tolerance", "synonyms", "faceted_search", "geo_search"]
          }
        }
      },
      
      // 📊 ANALYTICS & TRACKING
      analytics: {
        user_analytics: {
          name: "Complete Analytics Integration",
          description: "Track everything users do (privacy-compliant)",
          time_saved: "2-3 weeks",
          includes: [
            "page_view_tracking",
            "event_tracking",
            "user_journey_mapping",
            "conversion_funnels",
            "retention_analytics",
            "custom_dashboards"
          ],
          privacy_compliance: {
            gdpr: ["consent_management", "data_anonymization", "right_to_deletion"],
            cookie_banner: true,
            tracking_preferences: "granular_user_control"
          }
        }
      },
      
      // 🛒 E-COMMERCE FLOWS
      ecommerce: {
        shopping_cart: {
          name: "Complete Shopping Cart System",
          description: "Amazon-level cart experience",
          time_saved: "3-4 weeks",
          includes: [
            "persistent_cart_across_devices",
            "save_for_later",
            "quantity_management",
            "price_change_handling",
            "abandoned_cart_recovery",
            "guest_checkout",
            "cart_sharing"
          ]
        },
        
        checkout_flow: {
          name: "Optimized Checkout Process",
          description: "Conversion-optimized checkout",
          time_saved: "4-5 weeks",
          steps: [
            "address_autocomplete",
            "shipping_calculator",
            "tax_calculation",
            "payment_method_selection",
            "order_review",
            "post_purchase_upsell"
          ]
        }
      }
    };
  }
  
  getAgentCapabilities() {
    return {
      frontend_specialist: {
        name: "Frontend UI Expert",
        model: "claude-opus-4",
        system_prompt: `You are a specialized frontend development agent. Your expertise:
• Vue.js, React, Svelte component architecture
• Responsive design and accessibility (WCAG)
• Performance optimization and lazy loading
• State management patterns
• Animation and micro-interactions
• Component testing strategies

When given a task, you write production-ready components with:
- Clean, maintainable code
- Proper error handling
- Accessibility features
- Performance optimizations
- Beautiful, intuitive UI`,
        capabilities: ["vue", "react", "css", "animations", "a11y"],
        typical_tasks: ["Build UI components", "Create responsive layouts", "Implement interactions"]
      },
      
      backend_specialist: {
        name: "Backend API Expert", 
        model: "claude-opus-4",
        system_prompt: `You are a specialized backend development agent. Your expertise:
• RESTful and GraphQL API design
• Database design and optimization
• Authentication and authorization
• Caching strategies
• Message queues and event-driven architecture
• Microservices patterns

When given a task, you write secure, scalable services with:
- Proper error handling
- Input validation
- Rate limiting
- Database transactions
- Comprehensive logging`,
        capabilities: ["node", "python", "databases", "apis", "security"],
        typical_tasks: ["Build APIs", "Design schemas", "Implement auth"]
      },
      
      architect_specialist: {
        name: "System Architecture Expert",
        model: "claude-opus-4",
        system_prompt: `You are a system architecture specialist. Your expertise:
• Distributed systems design
• Scalability patterns
• Security architecture
• Cloud-native patterns
• Domain-driven design
• Event sourcing and CQRS

You create comprehensive architecture documents with:
- System diagrams
- Data flow specifications
- Security considerations
- Scaling strategies
- Technology choices with rationale`,
        capabilities: ["architecture", "system_design", "security", "scalability"],
        typical_tasks: ["Design system architecture", "Plan scalability", "Security review"]
      },
      
      ai_specialist: {
        name: "AI Integration Expert",
        model: "claude-opus-4",
        system_prompt: `You are an AI integration specialist. Your expertise:
• LLM integration (OpenAI, Anthropic, Google)
• Prompt engineering
• RAG systems
• Vector databases
• ML model deployment
• AI safety and alignment

You implement AI features with:
- Efficient prompt design
- Token optimization
- Error handling for AI responses
- Safety filters
- Performance monitoring`,
        capabilities: ["llm", "embeddings", "rag", "ml_ops", "prompt_engineering"],
        typical_tasks: ["Integrate AI APIs", "Build RAG systems", "Optimize prompts"]
      },
      
      testing_specialist: {
        name: "QA & Testing Expert",
        model: "claude-opus-4", 
        system_prompt: `You are a testing and QA specialist. Your expertise:
• Test strategy design
• Unit, integration, and E2E testing
• Performance testing
• Security testing
• Accessibility testing
• Test automation

You create comprehensive test suites with:
- High code coverage
- Edge case handling
- Performance benchmarks
- Security vulnerability scanning
- Accessibility compliance`,
        capabilities: ["jest", "cypress", "playwright", "security_testing", "load_testing"],
        typical_tasks: ["Write test suites", "Performance testing", "Security audit"]
      },
      
      realtime_specialist: {
        name: "Real-time Systems Expert",
        model: "claude-opus-4",
        system_prompt: `You are a real-time systems specialist. Your expertise:
• WebSocket architecture
• Server-Sent Events
• WebRTC implementation
• Message queuing (Redis, RabbitMQ)
• Presence systems
• Collaborative editing (CRDTs)

You build real-time features with:
- Low latency design
- Connection resilience
- State synchronization
- Conflict resolution
- Scalable pub/sub patterns`,
        capabilities: ["websockets", "webrtc", "redis", "pubsub", "crdts"],
        typical_tasks: ["Build chat systems", "Live collaboration", "Real-time sync"]
      }
    };
  }

  // Calculate total time saved
  calculateTimeSaved(selectedCapabilities) {
    let weeksSaved = 0;
    
    selectedCapabilities.forEach(cap => {
      // Each capability saves 2-8 weeks on average
      if (cap.includes('payment')) weeksSaved += 5;
      else if (cap.includes('voice')) weeksSaved += 3;
      else if (cap.includes('video')) weeksSaved += 6;
      else if (cap.includes('realtime')) weeksSaved += 4;
      else if (cap.includes('ai')) weeksSaved += 2;
      else weeksSaved += 2;
    });
    
    return {
      weeks: weeksSaved,
      months: Math.round(weeksSaved / 4),
      message: `Using ADE capabilities saves approximately ${weeksSaved} weeks (${Math.round(weeksSaved/4)} months) of development time`
    };
  }
}

module.exports = APMLCapabilityLibrary;
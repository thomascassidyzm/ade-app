/**
 * APML Guidance System - Provides L1_ORCH with comprehensive APML knowledge
 * Loaded automatically when L1_ORCH connects to ADE
 */

class APMLGuidanceSystem {
  constructor() {
    this.guidanceVersion = "1.0.0";
    this.guidancePackage = this.initializeGuidancePackage();
  }

  initializeGuidancePackage() {
    return {
      // Core APML Protocol Reference
      messageProtocols: {
        brief: {
          description: "High-level coordination between agents",
          structure: {
            task: "string",
            priority: "enum[low|medium|high|urgent]",
            requirements: "array",
            expected_deliverable: "string",
            deadline: "optional timestamp"
          },
          usage: "L1 → L2/L3 task assignment and coordination"
        },
        specification: {
          description: "Complete app specification in APML",
          structure: {
            app_meta: "object",
            screens: "array",
            user_flows: "object",
            data_models: "object",
            integrations: "optional object"
          },
          usage: "L1_ORCH → User presenting buildable spec"
        },
        design_feedback: {
          description: "User feedback during visualization phase",
          structure: {
            screen: "string",
            feedback: "string",
            change_type: "enum[flow|ui|data|integration]"
          },
          usage: "User → L1_ORCH during design iteration"
        }
      },

      // App User Interaction Patterns
      appMessageTypes: {
        user_action: {
          description: "User interactions within the app",
          examples: ["tap_button", "swipe_screen", "input_text", "long_press", "shake_device"],
          triggers: "UI interactions, gestures, device sensors"
        },
        system_response: {
          description: "App responses to user actions",
          examples: ["show_screen", "display_toast", "play_sound", "vibrate", "update_ui"],
          triggers: "User actions, data updates, system events"
        },
        data_flow: {
          description: "Information movement within the app",
          examples: ["save_local", "sync_cloud", "fetch_api", "cache_data", "queue_offline"],
          triggers: "User actions, background processes, network events"
        }
      },

      // Complete APML Examples Library
      exampleLibrary: {
        todo_app: {
          title: "Task Management App",
          apml: {
            app_meta: {
              name: "TaskMaster",
              platform: "mobile-first",
              theme: "productivity"
            },
            screens: ["home", "task_detail", "categories", "settings"],
            user_flows: {
              create_task: {
                entry: "tap_add_button",
                steps: [
                  { type: "user_action", action: "tap_add_button" },
                  { type: "system_response", action: "show_task_form" },
                  { type: "user_action", action: "input_task_details" },
                  { type: "user_action", action: "tap_save" },
                  { type: "data_flow", action: "save_to_database" },
                  { type: "system_response", action: "show_confirmation" }
                ]
              }
            },
            data_models: {
              task: {
                id: "uuid",
                title: "string",
                description: "optional string",
                due_date: "optional date",
                category_id: "uuid",
                completed: "boolean"
              }
            }
          }
        },
        social_feed: {
          title: "Social Media Feed",
          apml: {
            app_meta: {
              name: "SocialConnect",
              platform: "mobile-first",
              theme: "social"
            },
            screens: ["feed", "post_detail", "profile", "create_post"],
            user_flows: {
              like_post: {
                entry: "tap_heart_icon",
                steps: [
                  { type: "user_action", action: "tap_heart_icon" },
                  { type: "system_response", action: "animate_heart" },
                  { type: "data_flow", action: "update_like_count" },
                  { type: "data_flow", action: "notify_author" }
                ]
              }
            }
          }
        }
      },

      // Conversation Enhancement Prompts
      conversationHelpers: {
        discovery_questions: [
          "What problem does this app solve?",
          "Who are your target users?",
          "What are the 3-5 core features?",
          "How do users accomplish their main goal?",
          "What data needs to be stored?",
          "Any external services to integrate?"
        ],
        flow_clarifications: [
          "What happens when the user first opens the app?",
          "How does the user navigate between screens?",
          "What are the error scenarios?",
          "How does offline mode work?",
          "What requires authentication?"
        ],
        technical_considerations: [
          "Native app or web-based?",
          "Real-time updates needed?",
          "Push notifications required?",
          "Payment processing?",
          "Social login integration?"
        ]
      },

      // Output Requirements
      deliverables: {
        phase1_specification: {
          format: "APML specification object",
          includes: ["app_meta", "screens", "user_flows", "data_models"],
          quality_checks: ["all_flows_complete", "data_models_defined", "screens_mapped"]
        },
        phase2_visualization: {
          format: "Visual flow diagrams",
          includes: ["screen_mockups", "navigation_map", "interaction_flows"],
          quality_checks: ["all_screens_mocked", "flows_visualized", "gestures_defined"]
        },
        phase3_implementation: {
          format: "Deployable code",
          includes: ["frontend_code", "backend_api", "database_schema"],
          quality_checks: ["code_compiles", "tests_pass", "deployment_ready"]
        }
      },

      // Success Patterns
      successIndicators: {
        good_specification: [
          "User can clearly visualize the app",
          "All happy paths defined",
          "Error handling specified",
          "Data relationships clear",
          "Technical requirements explicit"
        ],
        ready_to_build: [
          "No ambiguous flows",
          "UI patterns selected",
          "Integrations identified",
          "Performance requirements set",
          "Security considerations addressed"
        ]
      },

      // Usage Patterns (from Claude Desktop's design)
      usagePatterns: {
        component_import: {
          example: `{
  "app_name": "TaskMaster",
  "imports": [
    "@ade/auth/email_auth",
    "@ade/profiles/user_profile", 
    "@ade/ui_patterns/list_view"
  ],
  "custom_screens": ["task_dashboard"],
  "merged_navigation": true
}`,
          explanation: "Import components, customize as needed, automatic integration"
        },
        
        template_usage: {
          example: `{
  "template": "@ade/templates/social_app",
  "customizations": {
    "theme": {"primary_color": "#FF6B6B"},
    "features": {"video_sharing": true},
    "remove": ["location_sharing"]
  }
}`,
          explanation: "Start with template, customize colors/features, remove unwanted parts"
        },
        
        response_format: {
          example: `Based on your requirements, I recommend:

📧 **@ade/auth/email_auth** - Professional login system (3 min)
📋 **@ade/ui_patterns/list_view** - Task lists with filtering (2 min)
🔔 **@ade/communication/push_notifications** - Task reminders (3 min)

Total build time: **8 minutes** vs 2 days from scratch!

Would you like me to create the specification using these components?`,
          explanation: "Show components, build times, and value proposition"
        }
      }
    };
  }

  // Generate guidance for L1_ORCH based on conversation phase
  getPhaseGuidance(phase) {
    switch(phase) {
      case 'specification':
        return {
          focus: "Understand and document complete app requirements",
          use: this.guidancePackage.conversationHelpers.discovery_questions,
          deliverable: this.guidancePackage.deliverables.phase1_specification
        };
      
      case 'visualization':
        return {
          focus: "Create visual representations of flows and screens",
          use: this.guidancePackage.conversationHelpers.flow_clarifications,
          deliverable: this.guidancePackage.deliverables.phase2_visualization
        };
      
      case 'implementation':
        return {
          focus: "Build and refine the actual app",
          use: this.guidancePackage.conversationHelpers.technical_considerations,
          deliverable: this.guidancePackage.deliverables.phase3_implementation
        };
      
      default:
        return this.guidancePackage;
    }
  }

  // Format guidance as APML message for L1_ORCH
  formatAsAPMLMessage() {
    return {
      apml: '1.0',
      type: 'system_guidance',
      from: 'ADE_SYSTEM',
      to: 'L1_ORCH',
      timestamp: new Date().toISOString(),
      content: {
        guidance_version: this.guidanceVersion,
        protocols: this.guidancePackage.messageProtocols,
        app_patterns: this.guidancePackage.appMessageTypes,
        examples: Object.keys(this.guidancePackage.exampleLibrary),
        helpers: this.guidancePackage.conversationHelpers,
        instruction: "Use this guidance to help users create complete, buildable app specifications through natural conversation."
      }
    };
  }
}

module.exports = APMLGuidanceSystem;
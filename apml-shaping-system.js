// APML Shaping System - L1_ORCH conversation engine
// Helps users transform ideas into complete APML specifications

class APMLShapingSystem {
  constructor() {
    this.conversation = [];
    this.apmlSpec = {
      metadata: {
        appName: '',
        description: '',
        platform: 'mobile-first-web',
        createdAt: new Date().toISOString()
      },
      screens: [],
      navigation: {},
      dataModels: {},
      interactions: [],
      integrations: []
    };
    this.currentContext = 'discovery';
  }

  // Gentle, loving conversation starters
  getConversationStarters() {
    return {
      discovery: [
        "Hi! I'm here to help bring your app idea to life. What would you like to build today?",
        "Tell me about your vision - what problem are you trying to solve?",
        "Who will use your app, and what will make their day better?"
      ],
      shaping: [
        "That sounds wonderful! Let me help you shape this idea. What's the main thing your users will do?",
        "I love where this is going! Can you walk me through how someone would use this?",
        "Great concept! What happens when a user first opens your app?"
      ],
      refinement: [
        "Perfect! Now let's add some magic. What would make this experience delightful?",
        "I can see this coming together! Any special features you've been dreaming about?",
        "This is shaping up beautifully! What data will your app need to remember?"
      ]
    };
  }

  // Extract intent and entities from user input
  analyzeUserInput(input) {
    const intents = {
      appType: this.detectAppType(input),
      features: this.extractFeatures(input),
      userFlow: this.extractUserFlow(input),
      dataNeeds: this.extractDataNeeds(input),
      emotions: this.detectEmotions(input)
    };
    return intents;
  }

  detectAppType(input) {
    const appTypes = {
      'todo': ['todo', 'task', 'list', 'organize', 'productivity'],
      'social': ['social', 'chat', 'message', 'friend', 'share', 'community'],
      'marketplace': ['buy', 'sell', 'shop', 'market', 'store', 'commerce'],
      'game': ['game', 'play', 'score', 'level', 'fun'],
      'health': ['health', 'fitness', 'track', 'workout', 'medical'],
      'education': ['learn', 'study', 'course', 'teach', 'education']
    };

    for (const [type, keywords] of Object.entries(appTypes)) {
      if (keywords.some(keyword => input.toLowerCase().includes(keyword))) {
        return type;
      }
    }
    return 'general';
  }

  extractFeatures(input) {
    const features = [];
    const featurePatterns = {
      authentication: ['login', 'sign up', 'authenticate', 'user account'],
      realtime: ['real-time', 'live', 'instant', 'push notification'],
      payment: ['pay', 'payment', 'purchase', 'buy', 'subscription'],
      social: ['share', 'comment', 'like', 'follow', 'friend'],
      media: ['photo', 'video', 'image', 'upload', 'camera'],
      location: ['map', 'location', 'nearby', 'gps', 'address']
    };

    for (const [feature, patterns] of Object.entries(featurePatterns)) {
      if (patterns.some(pattern => input.toLowerCase().includes(pattern))) {
        features.push(feature);
      }
    }
    return features;
  }

  extractUserFlow(input) {
    // Simple flow extraction - can be enhanced with NLP
    const flows = [];
    const actionWords = ['then', 'after', 'when', 'once', 'next'];
    
    // Split by action words to understand sequence
    const segments = input.split(/then|after|when|once|next/i);
    segments.forEach(segment => {
      if (segment.trim()) {
        flows.push(segment.trim());
      }
    });
    
    return flows;
  }

  extractDataNeeds(input) {
    const dataTypes = [];
    const dataPatterns = {
      user: ['user', 'profile', 'account', 'person'],
      content: ['post', 'content', 'article', 'item'],
      transaction: ['order', 'payment', 'transaction', 'purchase'],
      relationship: ['friend', 'follow', 'connection', 'group']
    };

    for (const [dataType, patterns] of Object.entries(dataPatterns)) {
      if (patterns.some(pattern => input.toLowerCase().includes(pattern))) {
        dataTypes.push(dataType);
      }
    }
    return dataTypes;
  }

  detectEmotions(input) {
    // Understand user's confidence and clarity
    const emotions = {
      confident: ['exactly', 'definitely', 'must have', 'need'],
      uncertain: ['maybe', 'possibly', 'not sure', 'might'],
      excited: ['awesome', 'amazing', 'love', 'great', '!'],
      frustrated: ['confused', 'don\'t know', 'help', 'stuck']
    };

    const detected = [];
    for (const [emotion, markers] of Object.entries(emotions)) {
      if (markers.some(marker => input.toLowerCase().includes(marker))) {
        detected.push(emotion);
      }
    }
    return detected;
  }

  // Generate supportive response based on analysis
  generateResponse(analysis) {
    let response = '';
    
    // Acknowledge what we understood
    if (analysis.appType !== 'general') {
      response += `I can see you're building a ${analysis.appType} app - that's exciting! `;
    }

    // Address emotions appropriately
    if (analysis.emotions.includes('uncertain')) {
      response += "No worries if you're not sure about all the details yet - we'll figure it out together. ";
    } else if (analysis.emotions.includes('excited')) {
      response += "I love your enthusiasm! Let's channel that energy into something amazing. ";
    }

    // Guide based on what's missing
    if (analysis.features.length === 0) {
      response += "What key features would make this app special for your users?";
    } else if (analysis.userFlow.length <= 1) {
      response += `Great features! Can you walk me through a typical user journey? For example, what happens after someone ${analysis.features[0]}?`;
    } else if (analysis.dataNeeds.length === 0) {
      response += "This flow makes sense! What information does the app need to remember about users or their activities?";
    } else {
      response += "This is really coming together! Let me show you what I'm understanding so far...";
    }

    return response;
  }

  // Convert understanding into APML structure
  buildAPMLFromConversation() {
    // Analyze entire conversation
    const fullAnalysis = this.conversation.map(turn => 
      turn.role === 'user' ? this.analyzeUserInput(turn.content) : null
    ).filter(Boolean);

    // Build screens based on features
    const screens = this.generateScreens(fullAnalysis);
    
    // Build navigation flow
    const navigation = this.generateNavigation(screens, fullAnalysis);
    
    // Build data models
    const dataModels = this.generateDataModels(fullAnalysis);
    
    // Build interactions
    const interactions = this.generateInteractions(screens, fullAnalysis);

    return {
      ...this.apmlSpec,
      screens,
      navigation,
      dataModels,
      interactions
    };
  }

  generateScreens(analyses) {
    const screens = [];
    const commonScreens = {
      authentication: ['LoginScreen', 'SignupScreen', 'ForgotPasswordScreen'],
      social: ['FeedScreen', 'ProfileScreen', 'MessagesScreen'],
      marketplace: ['BrowseScreen', 'ProductDetailScreen', 'CartScreen', 'CheckoutScreen'],
      todo: ['TaskListScreen', 'TaskDetailScreen', 'CreateTaskScreen']
    };

    // Always start with splash/onboarding
    screens.push({
      id: 'SplashScreen',
      type: 'splash',
      components: ['Logo', 'LoadingIndicator']
    });

    // Add screens based on detected features
    analyses.forEach(analysis => {
      if (analysis.appType && commonScreens[analysis.appType]) {
        commonScreens[analysis.appType].forEach(screenName => {
          if (!screens.find(s => s.id === screenName)) {
            screens.push({
              id: screenName,
              type: 'functional',
              components: this.getScreenComponents(screenName)
            });
          }
        });
      }
    });

    return screens;
  }

  getScreenComponents(screenName) {
    const componentMap = {
      'LoginScreen': ['EmailInput', 'PasswordInput', 'LoginButton', 'SignupLink'],
      'FeedScreen': ['PostList', 'CreatePostButton', 'NavigationBar'],
      'TaskListScreen': ['TaskList', 'AddTaskButton', 'FilterOptions'],
      'ProfileScreen': ['Avatar', 'UserInfo', 'ActionButtons', 'ContentGrid']
    };
    return componentMap[screenName] || ['Container', 'Content'];
  }

  generateNavigation(screens, analyses) {
    // Build navigation graph
    const nav = {
      initialRoute: 'SplashScreen',
      routes: {}
    };

    screens.forEach(screen => {
      nav.routes[screen.id] = {
        transitions: this.inferTransitions(screen, screens)
      };
    });

    return nav;
  }

  inferTransitions(currentScreen, allScreens) {
    const transitions = [];
    
    // Common navigation patterns
    if (currentScreen.id === 'SplashScreen') {
      transitions.push({ to: 'LoginScreen', trigger: 'onLoad' });
    } else if (currentScreen.id === 'LoginScreen') {
      transitions.push({ to: 'FeedScreen', trigger: 'onLoginSuccess' });
      transitions.push({ to: 'SignupScreen', trigger: 'onSignupTap' });
    }
    
    return transitions;
  }

  generateDataModels(analyses) {
    const models = {};
    
    // Generate models based on detected data needs
    analyses.forEach(analysis => {
      analysis.dataNeeds.forEach(need => {
        if (need === 'user' && !models.User) {
          models.User = {
            fields: {
              id: 'string',
              email: 'string',
              name: 'string',
              createdAt: 'timestamp'
            }
          };
        } else if (need === 'content' && !models.Content) {
          models.Content = {
            fields: {
              id: 'string',
              userId: 'string',
              text: 'string',
              createdAt: 'timestamp'
            }
          };
        }
      });
    });

    return models;
  }

  generateInteractions(screens, analyses) {
    const interactions = [];
    
    // Generate interactions based on screen components
    screens.forEach(screen => {
      if (screen.components.includes('LoginButton')) {
        interactions.push({
          trigger: 'LoginButton.onTap',
          action: 'authenticateUser',
          success: 'navigate:FeedScreen',
          failure: 'showError'
        });
      }
    });

    return interactions;
  }

  // Main conversation handler
  async processUserInput(input) {
    // Add to conversation
    this.conversation.push({ role: 'user', content: input });
    
    // Analyze input
    const analysis = this.analyzeUserInput(input);
    
    // Generate response
    const response = this.generateResponse(analysis);
    
    // Add response to conversation
    this.conversation.push({ role: 'assistant', content: response });
    
    // Update APML spec
    this.apmlSpec = this.buildAPMLFromConversation();
    
    return {
      response,
      apmlSpec: this.apmlSpec,
      visualizationReady: this.isReadyForVisualization()
    };
  }

  isReadyForVisualization() {
    // Check if we have enough info to show visual
    return this.apmlSpec.screens.length > 2 && 
           Object.keys(this.apmlSpec.dataModels).length > 0;
  }
}

module.exports = APMLShapingSystem;
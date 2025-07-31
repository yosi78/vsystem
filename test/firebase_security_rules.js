// Firebase Security Rules - firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // User profile documents
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
                     request.auth.token.admin == true;
    }
    
    // Main application data - only admins can modify
    match /appData/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      request.auth.token.admin == true &&
                      validateAppData(request.resource.data);
    }
    
    // Comments system with validation
    match /comments/{resourceId}/{commentId} {
      allow read: if request.auth != null;
      
      allow create: if request.auth != null &&
                       validateComment(request.resource.data) &&
                       request.resource.data.authorId == request.auth.uid &&
                       rateLimitCheck();
      
      allow update: if request.auth != null &&
                       (request.auth.uid == resource.data.authorId ||
                        request.auth.token.admin == true) &&
                       validateComment(request.resource.data);
      
      allow delete: if request.auth != null &&
                       (request.auth.uid == resource.data.authorId ||
                        request.auth.token.admin == true);
    }
    
    // Rate limiting tracking
    match /rateLimits/{userId} {
      allow read, write: if request.auth != null && 
                            request.auth.uid == userId;
    }
    
    // Audit logs - admin only
    match /auditLogs/{logId} {
      allow read, write: if request.auth != null && 
                            request.auth.token.admin == true;
    }
    
    // Deny all other requests
    match /{document=**} {
      allow read, write: if false;
    }
  }
}

// Validation functions
function validateComment(data) {
  return data.keys().hasAll(['text', 'author', 'authorId', 'timestamp']) &&
         data.text is string &&
         data.text.size() > 0 &&
         data.text.size() <= 1000 &&
         data.author is string &&
         data.author.size() <= 50 &&
         data.authorId == request.auth.uid;
}

function validateAppData(data) {
  return data.keys().hasAll(['mainTopics']) &&
         data.mainTopics is list &&
         validateMainTopics(data.mainTopics);
}

function validateMainTopics(topics) {
  return topics.size() <= 50 && // Maximum 50 main topics
         topics.hasOnly(['id', 'name', 'subTopics']) &&
         topics.name is string &&
         topics.name.size() > 0 &&
         topics.name.size() <= 100;
}

function rateLimitCheck() {
  // Check if user hasn't exceeded comment rate limit (5 comments per minute)
  let userRateLimit = get(/databases/$(database)/documents/rateLimits/$(request.auth.uid));
  return !exists(userRateLimit) || 
         userRateLimit.data.lastComment < request.time - duration.value(1, 'm') ||
         userRateLimit.data.commentCount < 5;
}
// Only create a server if we are in an environment with a HTTP server
// (as opposed to, eg, a command-line tool).
//
if (Package.webapp) {
  if (process.env.DDP_DEFAULT_CONNECTION_URL) {
    __meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL =
      process.env.DDP_DEFAULT_CONNECTION_URL;
  }

  Meteor.server = new Server;

  Meteor.refresh = function (notification) {
    var fence = DDPServer._CurrentWriteFence.get();
    if (fence) {
      // Block the write fence until all of the invalidations have
      // landed.
      var proxy_write = fence.beginWrite();
    }
    DDPServer._InvalidationCrossbar.fire(notification, function () {
      if (proxy_write)
        proxy_write.committed();
    });
  };

  // Proxy the public methods of Meteor.server so they can
  // be called directly on Meteor.
  _.each(['publish', 'methods', 'call', 'apply', 'onConnection'],
         function (name) {
           Meteor[name] = _.bind(Meteor.server[name], Meteor.server);
         });

  _.each(['notifyUser', 'isUserOnline'], function(name) {
    var stream_server = Meteor.server.stream_server;
    Meteor[name] = _.bind(stream_server[name], stream_server);
  });

} else {
  // No server? Make these empty/no-ops.
  Meteor.server = null;
  Meteor.refresh = function (notification) {
  };
}

// Meteor.server used to be called Meteor.default_server. Provide
// backcompat as a courtesy even though it was never documented.
// XXX COMPAT WITH 0.6.4
Meteor.default_server = Meteor.server;

var getSessionsForUser = function(userId) {
  var allSessions = Meteor.server.sessions;
  return _.filter(allSessions, function(session) {
    return session.userId === userId;
  });
};

Meteor.isUserOnline = function(userId) {
  return getSessionsForUser(userId).length > 0;
};

Polymer({
  is: 'main-app',

  observers: [
    'loadPage(route)',
  ],

  ready: function() {
    if (window.location.hash.startsWith('#%21')) {
      window.location.hash = '#!' + window.location.hash.substr(4);
    }

    if (window.location.pathname !== '/') {
      page.base(window.location.pathname);
    }

    page('*', function(ctx, next) {
      next();
      setTimeout(function() {
        var hash;
        var match = window.location.hash.match(/\#\w+/);
        if (match != null) {
          hash = match[0];
        }
        if (hash != null) {
          var elem = document.querySelector(hash);
          if (elem == null || elem.offsetTop == 0) {
            return;
          }
          window.scrollTo(0, elem.offsetTop - 100);
        }
      }, 100);
    });
    page('/*', function(_, next) {
      this.hideHeader = false;
      this.hideFooter = false;
      next();
    });
    const self = this;
    page('/register*', function() { self.route = 'register-form'; });
    page('/sponsors*', function() { self.route = 'sponsor-page'; });
    page('/dayof*', function() {
      self.hideHeader = true;
      self.route = 'dayof-page';
    });
    page('/rsvp/:id/:token/:status', function(e) {
      self.route = 'rsvp-page';
      self.params = e.params;
    });
    page('/select*', function() {
      self.hideHeader = true;
      self.hideFooter = true;
      self.route = 'select-hackers';
    });
    page('/*', function() { self.route = 'index-page'; });
    // 404
    page('*', this.handle404.bind(this));
    // add #! before urls
    page({hashbang: true, click: false});
  },
  loadPage: function(route) {
    const pageURL = 'components/' + route + '/' + route + '.html';
    this.importHref(pageURL, null, this.handle404, true);
  },
  handle404: function() {
    console.log('404!', this.route);
    page.redirect('/');
  }
});

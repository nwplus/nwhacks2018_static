Polymer({
  is: 'main-app',

  observers: [
    'loadPage(route)',
  ],

  ready: function() {
    if (window.location.hash.startsWith('#%21')) {
      window.location.hash = '#!' + window.location.hash.substr(4);
    }

    page('*', function(ctx, next) {
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

      self.hideHeader = false;
      self.hideFooter = false;
      self.adminPage = false;

      next();
    });
    const self = this;
    page('/register*', function() { self.route = 'register-closed'; });
    page('/sponsors*', function() { self.route = 'sponsor-page'; });
    page('/dayof*', function() {
      self.hideHeader = true;
      self.route = 'dayof-page';
    });
    page('/rsvp/:id', function(e) {
      self.route = 'rsvp-page';
      self.params = e.params;
    });

    page('/admin/*', function(_, next) {
      self.hideHeader = true;
      self.hideFooter = true;
      self.adminPage = true;
      next();
    });
    page('/admin/select', function() {
      self.route = 'select-hackers';
    });
    page('/admin/stats', function() {
      self.route = 'stats-page';
    });

    page('/*', function() { self.route = 'index-page'; });
    // 404
    page('*', this.handle404.bind(this));
    // add #! before urls
    page();
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

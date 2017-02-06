'use strict';
const categories = ['applied', 'accepted', 'waitlisted', 'rejected'];
Object.freeze(categories);
const responseCategories =
    ['no response', 'going', 'not going', 'need reimbursement'];
Object.freeze(responseCategories);
Polymer({
  is: 'select-hackers',

  properties: {
    hackers: {
      type: Array,
      value: [],
    },
    incr: {
      type: Number,
      value: 0,
    },
    categories: {
      type: Array,
      value: categories,
    },
    filters: {
      type: Object,
      value: function() {
	return {
	  search: '',
	  status: '',
	  response: '',
	};
      },
    },
    responseCategories: {
      type: Array,
      value: responseCategories,
    },
  },
  refresh: function() { this.incr++; },
  attached: function() {
    var self = this;
    setTimeout(function() { self.resize(); }, 100);
    window.addEventListener('resize', function() { self.resize(); });
  },
  resize: function() {
    var top = this.$.list.getBoundingClientRect().top;
    this.$.list.style.height = window.innerHeight - top + 'px';
  },
  observers: [
    'refresh(filters.status)',
    'refresh(filters.checked_in)',
    'refresh(filters.response)',
    'refresh(filters.search)',
    'refresh(filters.mentor)',
    'refresh(filters.first)',
    'refresh(filters.reimbursement)',
    'handleRegistrations(registrations)',
  ],
  cleanEmail: function(email) {
    return email.toLowerCase().trim();
  },
  handleRegistrations: function(registrations) {
    // Convert {[id]: hacker} to hacker[] sorted by ID.
    var hackers = [];
    for (var id in registrations) {
      var hacker = registrations[id];
      hacker.id = id;
      hackers.push(hacker);
    }
    hackers.sort(function(a, b) { return a.id < b.id; });

    // Deduplicate hackers
    var dedup = {};
    hackers.forEach((hacker, i) => {
      hacker.index = i;

      const email = this.cleanEmail(hacker.email);
      hacker.cleanEmail = email;
      const {count} = (dedup[email] || {count: 0});
      dedup[email] = {
	last: hacker.id,
	count: count+1
      };
    });
    hackers.forEach((hacker, i) => {
      const {last, count} = dedup[hacker.cleanEmail];
      if (count > 1 && last !== hacker.id) {
	hacker.duplicate = true;
      }
    });

    // Add required fields and unmunge status
    hackers.forEach((hacker) => {
      const lowerSchool = this.cleanEmail(hacker.school);
      if (lowerSchool.indexOf('secondary') >= 0 ||
	  lowerSchool.indexOf('high') >= 0) {
	hacker.hs = true;
      }
      if (!hacker.status) {
	hacker.status = 'applied';
      } else if (categories.indexOf(hacker.status) == -1) {
	hacker.status = categories[hacker.status];
      }
    });

    // Update search
    this.updateLunrIndex(hackers);

    console.log("hackers update");
    const scroll = this.$.list.scrollTop;
    this.hackers = hackers;
    this.$.list.scroll(0, scroll);
  },

  clusterTeams: function(hackers) {
    const emailIndex = {};
    hackers.forEach((hacker) => {
      emailIndex[hacker.cleanEmail] = hacker;
    });
    hackers.forEach((hacker) => {
      if (!hacker.teammates || hacker.teammates.trim().length === 0) {
	return;
      }
      const teammates = hacker.teammates.split(",").map((a) => this.cleanEmail(a));
    });
  },

  updateLunrIndex: function(hackers) {
    const search = lunr(function() {
      this.ref('index');
      this.field('id');
      this.field('city');
      this.field('email');
      this.field('emailSplit');
      this.field('github');
      this.field('personalsite');
      this.field('linkedin');
      this.field('name');
      this.field('reason');
      this.field('school');
      this.field('teammates');
    });
    hackers.forEach(function(hacker, i) {
      hacker.emailSplit = hacker.email.replace(/@/g, ' ');
      search.add(hacker);
    });
    this.lunr = search;
  },

  responseCat: function(i) { return this.responseCategories[i]; },
  eq: function(a, b) { return a == b; },
  export: function() {
    const copy = JSON.parse(JSON.stringify(this.filtered));
    copy.forEach((hacker) => {
      hacker.resume = this.resumeLink(hacker.resume);
    });
    var csv = new CSV(this.filtered, {header: true}).encode();
    this.downloadFile('applicants_export.csv', csv);
  },
  downloadFile: function(filename, content) {
    var blob = new Blob([content]);
    const a = document.createElement("a");
    a.setAttribute('download', filename);
    a.setAttribute('href', URL.createObjectURL(blob));
    document.body.appendChild(a);
    a.click();
  },
  title: function(hacker) { return hacker.name + ' (' + hacker.email + ')'; },
  filter: function(hackers, filters, _) {
    var results = hackers;
    this.totalCount = hackers.length;
    if (filters.search.length > 0) {
      var rawResults = this.lunr.search(filters.search);
      results =
	  rawResults.map(function(result) { return hackers[result.ref]; });
    }
    var status = filters.status;
    var response = filters.response;
    var responseIdx = this.responded(response);
    var filtered = results.filter(function(hacker, b, c) {
      var good = (status === '' || status === 'null' || status === 'All' ||
		  status === hacker.status) &&
	  (response === '' || response === 'null' || response === 'All' ||
	   hacker.acceptance_sent && responseIdx === hacker.response) &&
	  !hacker.duplicate;
      if (filters.mentor) {
	good = good && hacker.mentor;
      }
      if (filters.checked_in) {
	good = good && hacker.checked_in;
      }
      if (filters.reimbursement) {
	good = good && hacker.travel_reimbursement;
      }
      if (filters.first) {
	good = good && hacker.first_hackathon;
      }
      return good;
    });
    this.filtered = filtered;
    this.filteredCount = filtered.length;
    return filtered;
  },
  resumeLink: function(resume) {
    return "https://firebasestorage.googleapis.com/v0/b/nwhacks-96701.appspot.com/o/"+encodeURIComponent(resume)+"?alt=media";
  },
  githubLink: function(username) {
    if (!username) {
      return;
    }
    if (username.indexOf('github.com') > 0) {
      return username;
    }
    return 'https://github.com/' + username;
  },
  linkedinLink: function(username) {
    if (!username) {
      return;
    }
    if (username.indexOf('linkedin.com') > 0) {
      return username;
    }
    return 'https://linkedin.com/in/' + username;
  },
  selected: function(status) {
    var index = categories.indexOf(status);
    if (index >= 0) {
      return index;
    }
    return 0;
  },
  responded: function(status) {
    var index = responseCategories.indexOf(status);
    if (index >= 0) {
      return index;
    }
    return 0;
  },
  eq: function(a, b) { return a === b; },
  respondedWith: function(hacker, response) {
    return hacker.acceptance_sent && hacker.response === response;
  },
  onSelect: function(e) {
    var index = e.target.selectedIndex;
    var status = categories[index];
    var hacker = e.model.hacker;
    if (hacker.status !== status) {
      this.set('hackers.' + hacker.index + '.status', status);
      this.patchHacker(hacker);
    }
  },
  phoneChange: function(e) {
    var hacker = e.model.hacker;
    this.patchHacker(hacker);
  },
  checkIn: function(e) {
    var hacker = e.model.hacker;
    this.patchHacker(hacker);
  },
  patchHacker: function(hacker) {
    this.$.regs.setStoredValue('/registrations/'+hacker.id, hacker);
  },
  refreshList: function() { this.incr++; },
  handleErr: function(a, b, c) { this.handleError(a, b.error); },
  hackerAdminURL: function(hacker) {
    return '/api/admin/nwhacks/registration/' + hacker.id + '/change/';
  },
  handleError: function(e, err) {
    console.log('Error', err);
    this.error = err;
    this.$.error.open();
  },
});

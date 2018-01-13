var patterns = {
  'University of British Columbia': [
    'UBC',
    'University of British Columbia',
    'University of the British Columbia',
    'University of British Colombia',
    'university british columbia',
  ],
  'Simon Fraser University': ['SFU', 'Simon Fraser', 'Somion Fraser'],
  'University of Waterloo': ['Waterloo'],
  'BCIT': ['BCIT', 'British Columbia Institute of Technology'],
  'University of Illinois Urbana-Champaign':
      ['Urbana-Champaign', 'Urbana Champaign'],
  'McGill University': ['McGill'],
  'University of Washington':
      ['University of Washington', 'UW', 'University of Washingon'],
};

var patternsCities = {
  'Vancouver': [
    'UBC',
    'University of British Columbia',
    'Vanouver',
    'Vancouver',
    'Gage',
    'Marine Drive',
    'Locally',
    'Vancover',
    'Campus',
    'N/a',
    'University of the British Columbia',
    'University of British Colombia',
    'university british columbia',
  ],
  'Seattle': ['University of Washington'],
};

Polymer({
  is: 'stats-page',

  observers: [
    'renderData(registrations)'
  ],

  renderData: function (registrations) {
    _.each(this.charts, function(chart) { chart.destroy(); });
    this.charts = []
    var charts = this.charts
    this.registrationCount = registrations.length
    var univs = {}
    var students = {}
    var cities = {}
    var deDupStudents = 0
    var acceptedStudents = 0
    var offeredStudents = 0
    let rsvpStudents = 0
    var checked_in = 0
    let nfc_written = 0
    let nfc_or_checked_in = 0

    // T-Shirts
    var tshirtData = {
      labels: ['S', 'M', 'L', 'XL'],
      datasets: [
        {
          label: 'Offered Sizes',
          backgroundColor: 'rgba(220,0,0,0.5)',
          borderColor: 'rgba(220,0,0,0.8)',
          data: [0, 0, 0, 0]
        },
      ]
    };

    var responseData = {
      labels: ['No Response', 'Going', 'Not Going'],
      datasets: [{
        data: [0, 0, 0],
        backgroundColor: [
          '#666',
          '#4BAE74',
          '#FF6B6B',
          /*'#FDB45C',*/
        ],
        hoverBackgroundColor: [
          '#888',
          '#377F54',
          '#D74343',
          /*'#FFC870',*/
        ],
      }]
    };

    var self = this;

    _.each(registrations, function(datum) {
      // Cleanup step
      _.each(patterns, function(pattern, remap) {
        _.each(pattern, function(p) {
          if ((datum.school || '').toLowerCase().trim().indexOf(p.toLowerCase()) >= 0) {
            datum.school = remap;
          }
        });
      });
      _.each(patternsCities, function(pattern, remap) {
        _.each(pattern, function(p) {
          if ((datum.city || '').toLowerCase().trim().indexOf(p.toLowerCase()) >= 0) {
            datum.city = remap;
          }
        });
      });

      if (datum.email) {
        datum.email = datum.email.toLowerCase().trim();
      }
      var email = datum.email;
      var isDuplicate = students[email] && datum.status != 'accepted' ||
          students[email] && students[email].status == 'accepted';

      let accepted = false
      for (let key of Object.keys(datum.tags || {})) {
        if (key.indexOf('accepted') !== -1) {
          accepted = true
        }
      }

      const going = accepted && datum.rsvp && datum.rsvp.going

      if (accepted) {
        let index = 0
        if (going) {
          index = 1
        } else if (datum.rsvp && !datum.rsvp.going) {
          index = 2
        }
        responseData.datasets[0].data[index]++

        if (datum.rsvp) {
          rsvpStudents++
        }
      }

      if (datum.nfc_written) {
        nfc_written++
      }
      if (datum.checked_in) {
        checked_in++
      }
      if (datum.checked_in || datum.nfc_written) {
        nfc_or_checked_in++
      }

      if (isDuplicate) {
        return;
      }
      deDupStudents++;
      students[email] = datum;

      if (going) {
        var index = tshirtData.labels.indexOf(datum.tshirt);
        tshirtData.datasets[0].data[index] += 1;
      }

      if (!univs[datum.school]) {
        univs[datum.school] =
            {name: datum.school, accepted: 0, acceptedResp: 0, total: 0};
      }
      univs[datum.school].total += 1;
      var location = self.toTitleCase((datum.city || '').split(',')[0].trim());
      if (!cities[location]) {
        cities[location] = {
          name: location,
          accepted: 0,
          acceptedResp: 0,
          total: 0
        }
      }
      cities[location].total += 1;

      if (accepted) {
        univs[datum.school].accepted += 1;
        cities[location].accepted += 1;
        acceptedStudents++
        offeredStudents++
      }
      if (going) {
        univs[datum.school].acceptedResp += 1;
        cities[location].acceptedResp += 1;
      }
    });

    this.deDupStudents = deDupStudents
    this.acceptedStudents = acceptedStudents
    this.rsvpStudents = rsvpStudents
    this.offeredStudents = offeredStudents

    // Univerisities
    var data = {
      labels: [],
      datasets: [
        {
          label: 'Total Students',
          backgroundColor: 'rgba(220,0,0,0.5)',
          borderColor: 'rgba(220,0,0,0.8)',
          data: []
        },
        {
          label: 'Offered Students',
          backgroundColor: 'rgba(0,0,220,0.5)',
          borderColor: 'rgba(0,0,220,0.8)',
          data: []
        },
        {
          label: 'Going Students',
          backgroundColor: 'rgba(0,220,220,0.5)',
          borderColor: 'rgba(0,220,220,0.8)',
          data: []
        },
      ]
    };
    var sortedUnivs = _(univs).toArray().sortBy(['accepted', 'total']).reverse().value();
    _.each(sortedUnivs, function(v) {
      data.labels.push(v.name);
      data.datasets[0].data.push(v.total);
      data.datasets[1].data.push(v.accepted);
      data.datasets[2].data.push(v.acceptedResp);
    });
    var ctx = this.$.university.getContext('2d');
    charts.push(new Chart(
        ctx, {
          type: 'bar',
          data: data,
          options: {
            responsive: false
          }
        },
        {}));

    // Cities

    var dataCities = {
      labels: [],
      datasets: [
        {
          label: 'Total Students',
          backgroundColor: 'rgba(0,220,0,0.5)',
          borderColor: 'rgba(0,220,0,0.8)',
          data: []
        },
        {
          label: 'Offered Students',
          backgroundColor: 'rgba(0,0,220,0.5)',
          borderColor: 'rgba(0,0,220,0.8)',
          data: []
        },
        {
          label: 'Going Students',
          backgroundColor: 'rgba(0,220,220,0.5)',
          borderColor: 'rgba(0,220,220,0.8)',
          data: []
        },
      ]
    };
    var sortedCities = _(cities).toArray().sortBy(['accepted', 'total']).reverse().value();
    _.each(sortedCities, function(v) {
      dataCities.labels.push(v.name);
      dataCities.datasets[0].data.push(v.total);
      dataCities.datasets[1].data.push(v.accepted);
      dataCities.datasets[2].data.push(v.acceptedResp);
    });
    var ctx = this.$.city.getContext('2d');
    charts.push(new Chart(
        ctx, {
          type: 'bar',
          data: dataCities,
          options: {
            responsive: false
          }
        },
        {}));

    var ctx = this.$.tshirt.getContext('2d');
    charts.push(new Chart(
        ctx, {
          type: 'bar',
          data: tshirtData,
          options: {
            responsive: false
          }
        },
        {}));

    var ctx = this.$.response.getContext('2d');
    charts.push(new Chart(
        ctx, {
          type: 'doughnut',
          data: responseData,
          options: {
            responsive: false
          }
        },
        {}));
    this.going = responseData.datasets[0].data[1];

    const rsvped = registrations.filter((a) => a.rsvp && a.rsvp.going)
    this.dietaryRestrictions = rsvped.map((a) => {
      if (a.dietary_other) {
        return `${a.dietary} - ${a.dietary_other}`
      }
      return a.dietary
    })
    this.rsvpGender = rsvped.map((a) => a.gender)
    this.rsvpFaculty = rsvped.map((a) => a.major)
    this.rsvpYear = rsvped.map((a) => a.graduation)
    this.rsvpPassport = rsvped.map((a) => a.passport)
    this.rsvpMajority = rsvped.map((a) => moment(a.birthday).fromNow(true))
    this.checked_in = checked_in
    this.nfc_written = nfc_written
    this.nfc_or_checked_in = nfc_or_checked_in
  },

  // https://stackoverflow.com/questions/4878756/javascript-how-to-capitalize-first-letter-of-each-word-like-a-2-word-city
  toTitleCase: function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }
});

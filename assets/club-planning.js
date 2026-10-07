(function () {
  'use strict';
  function number(value, label, min, max, integer) {
    if (String(value == null ? '' : value).trim() === '') throw new Error('Enter ' + label + '.');
    var n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
      throw new Error('Check ' + label + ': ' + (integer ? 'use a whole number' : 'use a number') + ' between ' + min + ' and ' + max + '.');
    }
    return n;
  }
  function capacity(input) {
    var hours = number(input.hours, 'sellable hours per court per year', 0.01, 8784);
    var demand = number(input.demand, 'expected booked court-hours per year', 0, 1e9);
    return [2, 4, 6, 8].map(function (courts) {
      return { courts: courts, available: courts * hours, occupancy: demand / (courts * hours) * 100 };
    });
  }
  function breakEven(input) {
    var courts = number(input.courts, 'court count', 1, 1000, true);
    var hours = number(input.hours, 'sellable hours per court per year', 0.01, 8784);
    var fixed = number(input.fixed, 'annual fixed operating costs', 0, 1e12);
    var other = number(input.other, 'annual non-court contribution', -1e12, 1e12);
    var margin = number(input.margin, 'net contribution per booked court-hour', 0, 1e12);
    if (margin === 0) throw new Error('Net contribution per booked court-hour must be greater than zero; there is no finite booking break-even at zero margin.');
    var required = Math.max(0, (fixed - other) / margin);
    var available = courts * hours;
    if (!Number.isFinite(required)) throw new Error('Check the contribution per hour; the result is too large to calculate.');
    return { required: required, available: available, occupancy: required / available * 100 };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { capacity: capacity, breakEven: breakEven };
  if (typeof document === 'undefined') return;
  var fmt = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });
  document.querySelectorAll('[data-club-planning]').forEach(function (section) {
    var form = section.querySelector('form');
    var output = section.querySelector('[data-planning-result]');
    var empty = output.textContent;
    form.querySelectorAll('button').forEach(function (button) { button.disabled = false; });
    function clear() { output.textContent = empty; }
    form.addEventListener('input', clear);
    form.addEventListener('reset', clear);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var values = {};
      form.querySelectorAll('input[name]').forEach(function (field) { values[field.name] = field.value; });
      output.replaceChildren();
      try {
        if (section.dataset.clubPlanning === 'capacity') {
          var rows = capacity(values);
          var table = document.createElement('table');
          var head = document.createElement('thead');
          var header = document.createElement('tr');
          ['Courts', 'Sellable court-hours / year', 'Required annual occupancy'].forEach(function (text) {
            var th = document.createElement('th'); th.scope = 'col'; th.textContent = text; header.appendChild(th);
          });
          head.appendChild(header); table.appendChild(head);
          var body = document.createElement('tbody');
          rows.forEach(function (row) {
            var tr = document.createElement('tr');
            [row.courts, fmt.format(row.available), fmt.format(row.occupancy) + '%' + (row.occupancy > 100 ? ' — exceeds capacity' : '')].forEach(function (value) {
              var td = document.createElement('td'); td.textContent = String(value); tr.appendChild(td);
            });
            body.appendChild(tr);
          });
          table.appendChild(body); output.appendChild(table);
          var note = document.createElement('p');
          note.textContent = 'This annual comparison assumes the same demand and sellable hours per court in every layout. Check peak-hour scheduling separately; a lower average occupancy does not prove demand or profitability.';
          output.appendChild(note);
        } else {
          var result = breakEven(values);
          output.textContent = 'Required booked court-hours / year: ' + fmt.format(result.required) + '. Sellable court-hours / year: ' + fmt.format(result.available) + '. Break-even annual occupancy: ' + fmt.format(result.occupancy) + '%.';
          var detail = document.createElement('p');
          detail.textContent = result.occupancy > 100 ? 'Required hours exceed annual capacity. Revise the costs, contribution or layout; this scenario cannot break even within the entered capacity.' : result.required === 0 ? 'The entered non-court contribution covers the fixed costs. This does not establish investment payback or validate the non-court business.' : 'Compare this threshold with evidence-based peak and off-peak demand. This operating calculation does not establish investment payback.';
          output.appendChild(detail);
        }
      } catch (error) { output.textContent = error.message; }
    });
  });
}());

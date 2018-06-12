exports.lengthValid = function (input, min, max) {
    return input ? input.length >= min || input.length <= max: false;
};

exports.alphabetOnly = function (input) {
  return /^[A-Za-z0-9]+$/.test(input);
};

exports.isEmail = function (input) {
  return /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/.test(input);
};
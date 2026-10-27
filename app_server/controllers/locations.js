const apiOptions = {
  server: process.env.API_BASE_URL || `http://127.0.0.1:${process.env.PORT || '3000'}`
};

if (process.env.NODE_ENV === 'production') {
  apiOptions.server = 'https://loc8r-api-3hno.onrender.com';
}

const formatDistance = (distance) => {
  if (distance > 1000) {
    return `${(distance / 1000).toFixed(1)}km`;
  }
  return `${Math.floor(distance)}m`;
};

const renderHomepage = (req, res, responseBody) => {
  let message = null;
  if (!Array.isArray(responseBody)) {
    message = 'API lookup error';
    responseBody = [];
  } else if (!responseBody.length) {
    message = 'No places found nearby';
  }

  res.render('locations-list', {
    title: 'Loc8r - find a place to work with wifi',
    pageHeader: {
      title: 'Loc8r',
      strapLine: 'Find places to work with wifi near you!'
    },
    sidebar: 'Looking for wifi and a seat? Loc8r helps you find places to work when out and about. Perhaps with coffee, cake or a pint? Let Loc8r help you find the place you\'re looking for.',
    locations: responseBody,
    message
  });
};

const homelist = async (req, res) => {
  let data;
  try {
    const url = new URL('/api/locations', apiOptions.server);
    url.search = new URLSearchParams({
      lng: '127.0255',
      lat: '37.5045',
      maxDistance: '200000'
    }).toString();

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    if (response.status !== 200) {
      throw new Error(`Locations API returned HTTP ${response.status}.`);
    }
    const responseBody = await response.json();
    if (!Array.isArray(responseBody)) {
      throw new Error('Locations API did not return an array.');
    }
    data = responseBody.map(location => ({
      ...location,
      distance: formatDistance(location.distance)
    }));
  } catch (err) {
    data = err;
  }
  return renderHomepage(req, res, data);
};

const renderDetailPage = (req, res, location) => {
  res.render('location-info', {
    title: location.name,
    pageHeader: { title: location.name },
    sidebar: {
      context: 'is on Loc8r because it has accessible wifi and space to sit down with your laptop and get some work done.',
      callToAction: 'If you\'ve been and you like it - or if you don\'t - please leave a review to help other people just like you.'
    },
    location,
    googleApiKey: process.env.GOOGLE_API_KEY || ''
  });
};

const showError = (req, res, status) => {
  let title;
  let content;
  if (status === 404) {
    title = '404, page not found';
    content = 'Oh dear. Looks like you can\'t find this page. Sorry.';
  } else {
    title = `${status}, something's gone wrong`;
    content = 'Something, somewhere, has gone just a little bit wrong.';
  }

  res.status(status);
  return res.render('generic-text', { title, content });
};

const getLocationInfo = async (req, res, callback) => {
  let location;
  try {
    const url = new URL(`/api/locations/${encodeURIComponent(req.params.locationid)}`, apiOptions.server);
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    if (response.status !== 200) {
      const error = new Error(`Location API returned HTTP ${response.status}.`);
      error.status = response.status;
      throw error;
    }

    const responseBody = await response.json();
    const coordinates = Array.isArray(responseBody?.coords)
      ? responseBody.coords
      : responseBody?.coords?.coordinates;
    if (!responseBody || typeof responseBody !== 'object' || Array.isArray(responseBody)
      || !Array.isArray(coordinates) || coordinates.length !== 2 || !coordinates.every(Number.isFinite)) {
      throw new Error('Location API did not return a location with valid coordinates.');
    }
    location = {
      ...responseBody,
      coords: { lng: coordinates[0], lat: coordinates[1] }
    };
  } catch (err) {
    return showError(req, res, err.status || 502);
  }
  return callback(req, res, location);
};

const locationInfo = (req, res) => {
  return getLocationInfo(req, res, renderDetailPage);
};

const renderReviewForm = (req, res, { name }) => {
  return res.render('location-review-form', {
    title: `Review ${name} on Loc8r`,
    pageHeader: { title: `Review ${name}` },
    error: req.query.err
  });
};

const addReview = (req, res) => {
  return getLocationInfo(req, res, renderReviewForm);
};

const doAddReview = async (req, res) => {
  const locationid = req.params.locationid;
  const body = req.body || {};
  const rawRating = body.rating;
  const postdata = {
    author: typeof body.name === 'string' ? body.name.trim() : '',
    rating: (typeof rawRating === 'string' && rawRating.trim() !== '') || typeof rawRating === 'number'
      ? Number(rawRating)
      : NaN,
    reviewText: typeof body.review === 'string' ? body.review.trim() : ''
  };

  if (!postdata.author || !Number.isInteger(postdata.rating)
    || postdata.rating < 0 || postdata.rating > 5 || !postdata.reviewText) {
    return res.redirect(`/location/${encodeURIComponent(locationid)}/review/new?err=val`);
  }

  let response;
  try {
    const url = new URL(`/api/locations/${encodeURIComponent(locationid)}/reviews`, apiOptions.server);
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postdata),
      signal: AbortSignal.timeout(5000)
    });
  } catch (err) {
    return showError(req, res, 502);
  }

  if (response.status === 201) {
    return res.redirect(`/location/${encodeURIComponent(locationid)}`);
  }
  if (response.status === 400) {
    const responseBody = await response.json().catch(() => null);
    if (responseBody?.name === 'ValidationError') {
      return res.redirect(`/location/${encodeURIComponent(locationid)}/review/new?err=val`);
    }
  }
  return showError(req, res, response.status);
};

module.exports = {
  homelist,
  locationInfo,
  addReview,
  doAddReview
};

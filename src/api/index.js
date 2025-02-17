import TokenService from '../services/token';

export const serverUrl = window.cat.SERVER_URL || 'http://127.0.0.1:8080';

const apiUrl = url => `${serverUrl}${url}`;

function checkStatus(resp) {
  // when server return Unauthorized we need to remove token
  if (resp.status === 401) {
    TokenService.remove();
  }
  if (resp.status < 200 || resp.status >= 300) {
    return resp
      .json()
      .catch(() => {
        throw new Error(resp.statusText);
      })
      .then(json => {
        if (json.errors) {
          throw json.errors;
        }
        throw new Error(resp.statusText);
      });
  }
  return resp;
}

function normalizeError(err) {
  if (typeof err === 'object') {
    // error from server
    if (err.title) {
      return err.title;
    }
    // javascript error
    if (err.message) {
      return err.message;
    }
    // weird object as error, shouldn't really happen
    return JSON.stringify(err);
  }
  if (typeof err === 'string') {
    return err;
  }
  return 'Internal error';
}

function normalizeErrors(err) {
  if (Array.isArray(err)) {
    return err.map(e => normalizeError(e));
  }
  return [normalizeError(err)];
}

function apiCall(url, options = {}) {
  const token = TokenService.get();
  const fetchOptions = {
    ...options,
    credentials: 'include',
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  };

  if (options.body) {
    if (options.formData) {
      fetchOptions.body = options.body;
    } else {
      fetchOptions.body = JSON.stringify(options.body);
      fetchOptions.headers['Content-Type'] = 'application/json';
    }
  }

  return fetch(apiUrl(url), fetchOptions)
    .then(checkStatus)
    .then(resp => resp.json())
    .then(json => {
      if (json.errors) {
        throw json.errors;
      }
      return json.data;
    })
    .catch(err => Promise.reject(normalizeErrors(err)));
}

function auth(queryString) {
  return apiCall(`/api/auth${queryString}`);
}

function me() {
  return apiCall(`/api/me`);
}

function getExperiments() {
  return apiCall(`/api/experiments`);
}

function createExperiment(name, description) {
  return apiCall(`/api/experiments`, {
    method: 'POST',
    body: { name, description },
  });
}

function updateExperiment(experimentId, name, description) {
  return apiCall(`/api/experiments/${experimentId}`, {
    method: 'PUT',
    body: { name, description },
  });
}

function getExperiment(experimentId) {
  return apiCall(`/api/experiments/${experimentId}`);
}

function uploadFilePairs(experimentId, file) {
  const formData = new FormData();
  formData.append('input_db', file);

  return apiCall(`/api/experiments/${experimentId}/file-pairs`, {
    method: 'POST',
    formData: true,
    body: formData,
  });
}

function getAssignments(experimentId) {
  return apiCall(`/api/experiments/${experimentId}/assignments`);
}

function getFilePair(experimentId, pairId, showInvisible = false) {
  let queryStr = '';
  if (showInvisible) {
    queryStr = '?showInvisible=1';
  }
  return apiCall(
    `/api/experiments/${experimentId}/file-pairs/${pairId}${queryStr}`
  );
}

function putAnswer(experimentId, assignmentId, answer) {
  return apiCall(
    `/api/experiments/${experimentId}/assignments/${assignmentId}`,
    {
      method: 'PUT',
      body: answer,
    }
  );
}

function getFilePairs(experimentId) {
  return apiCall(`/api/experiments/${experimentId}/file-pairs`);
}

function getFilePairAnnotations(experimentId, id) {
  return apiCall(
    `/api/experiments/${experimentId}/file-pairs/${id}/annotations`
  );
}

function getFeatures(filePairId) {
  return apiCall(`/api/file-pair/${filePairId}/features`);
}

function exportList() {
  return apiCall('/api/exports');
}

function exportCreate() {
  return apiCall(`/api/exports`, {
    method: 'POST',
  });
}

function exportDownload(filename) {
  const token = TokenService.get();
  const url = apiUrl(`/api/exports/${filename}/download?jwt_token=${token}`);
  window.open(url, '_blank');
}

export default {
  auth,
  me,
  getExperiments,
  createExperiment,
  updateExperiment,
  getExperiment,
  uploadFilePairs,
  getAssignments,
  getFilePair,
  putAnswer,
  exportList,
  exportCreate,
  exportDownload,
  getFilePairs,
  getFeatures,
  getFilePairAnnotations,
};

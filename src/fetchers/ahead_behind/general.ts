
/* IMPORT */

import * as _ from 'lodash';
import {fetchAheadBehindGit} from './git';

/* GENERAL */

async function fetchAheadBehindGeneral ( folderPath, updateCache = true ) {

  const fetchers = [fetchAheadBehindGit];

  for ( let fetcher of fetchers ) {

    const result = await fetcher ( folderPath, updateCache );

    if ( _.isPlainObject ( result ) ) return result;

  }

  return false;

}

async function fetchAheadBehindGeneralMulti ( folderPaths ) {

  const multi = {};

  for ( let i = 0, l = folderPaths.length; i < l; i++ ) {

    multi[folderPaths[i]] = await fetchAheadBehindGeneral ( folderPaths[i], i === l - 1 );

  }

  return multi;

}

/* EXPORT */

export {fetchAheadBehindGeneral, fetchAheadBehindGeneralMulti};

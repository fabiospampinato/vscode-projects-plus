
/* IMPORT */

import * as _ from 'lodash';
import {fetchDirtyGit} from './git';

/* GENERAL */

async function fetchDirtyGeneral ( folderPath, updateCache = true ) {

  const fetchers = [fetchDirtyGit];

  for ( let fetcher of fetchers ) {

    const result = await fetcher ( folderPath, updateCache );

    if ( _.isBoolean ( result ) ) return result;

  }

  return false;

}

async function fetchDirtyGeneralMulti ( folderPaths ) {

  const multi = {};

  for ( let i = 0, l = folderPaths.length; i < l; i++ ) {

    multi[folderPaths[i]] = await fetchDirtyGeneral ( folderPaths[i], i === l - 1 );

  }

  return multi;

}

/* EXPORT */

export {fetchDirtyGeneral, fetchDirtyGeneralMulti};

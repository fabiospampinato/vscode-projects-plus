
/* IMPORT */

import * as _ from 'lodash';
import {fetchDirtyGit} from './git';

/* GENERAL */

async function fetchDirtyGeneral ( folderpath, updateCache = true ) {

  const fetchers = [fetchDirtyGit];

  for ( let fetcher of fetchers ) {

    const result = await fetcher ( folderpath, updateCache );

    if ( _.isBoolean ( result ) ) return result;

  }

  return false;

}

async function fetchDirtyGeneralMulti ( folderpaths ) {

  const multi = {};

  for ( let i = 0, l = folderpaths.length; i < l; i++ ) {

    multi[folderpaths[i]] = await fetchDirtyGeneral ( folderpaths[i], i === l - 1 );

  }

  return multi;

}

/* EXPORT */

export {fetchDirtyGeneral, fetchDirtyGeneralMulti};

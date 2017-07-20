
/* IMPORT */

import * as _ from 'lodash';
import {fetchBranchGit} from './git';

/* GENERAL */

async function fetchBranchGeneral ( folderpath ) {

  const fetchers = [fetchBranchGit];

  for ( let fetcher of fetchers ) {

    const result = await fetcher ( folderpath );

    if ( _.isString ( result ) ) return result;

  }

  return false;

}

async function fetchBranchGeneralMulti ( folderpaths ) {

  const multi = {};

  for ( let folderpath of folderpaths ) {

    multi[folderpath] = await fetchBranchGeneral ( folderpath );

  }

  return multi;

}

/* EXPORT */

export {fetchBranchGeneral, fetchBranchGeneralMulti};


/* IMPORT */

import * as path from 'path';
import Utils from '../../utils';
import {fetchNPMDescription} from './npm';

/* PATH */

async function fetchPathDescription ( folderpath ) {

  const getters = [fetchNPMDescription];

  for ( let getter of getters ) {

    const description = await getter ( folderpath );

    if ( description ) return description;

  }

}

/* EXPORT */

export {fetchPathDescription};

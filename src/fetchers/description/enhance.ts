
/* IMPORT */

import {fetchPathDescription} from './path';
import Utils from '../../utils';

/* ENHANCE */

async function enhanceWithDescriptions ( config ) {

  const projects = Utils.config.getProjects ( config );

  await Promise.all ( projects.map ( async project => {

    // if ( project.description ) return; //FIXME: Maybe this should be enabled

    const description = await fetchPathDescription ( project.path );

    if ( !description ) return;

    project['description'] = description;

  }));

  return config;

}

/* EXPORT */

export {enhanceWithDescriptions};

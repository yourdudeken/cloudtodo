import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
].join(' ');

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI;
const APP_FOLDER_NAME = 'Todo App Data';
const MAIN_FILE_NAME = 'todos.json';

export const getAuthUrl = () => {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  
  // Add all required OAuth parameters
  url.searchParams.append('client_id', CLIENT_ID);
  url.searchParams.append('redirect_uri', REDIRECT_URI);
  url.searchParams.append('response_type', 'token');
  url.searchParams.append('scope', SCOPES);
  url.searchParams.append('access_type', 'offline');
  url.searchParams.append('prompt', 'consent');
  
  return url.toString();
};

export const getUserProfile = async (accessToken: string) => {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  try {
    const [userInfoResponse, emailResponse] = await Promise.all([
      fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers }),
      fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers })
    ]);

    if (!userInfoResponse.ok || !emailResponse.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const [userInfo, emailInfo] = await Promise.all([
      userInfoResponse.json(),
      emailResponse.json()
    ]);

    return {
      id: userInfo.id,
      name: userInfo.name,
      givenName: userInfo.given_name,
      familyName: userInfo.family_name,
      picture: userInfo.picture,
      email: emailInfo.email,
      locale: userInfo.locale,
      verified_email: emailInfo.verified_email,
      hd: emailInfo.hd // Hosted domain (for Google Workspace users)
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

async function getOrCreateAppFolder(accessToken: string): Promise<string> {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  try {
    // Search for existing folder
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`,
      { headers }
    );
    const searchData = await searchResponse.json();

    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // Create new folder if it doesn't exist
    const createResponse = await fetch(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: APP_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
          parents: ['root']
        })
      }
    );
    
    if (!createResponse.ok) {
      throw new Error('Failed to create app folder');
    }
    
    const data = await createResponse.json();
    return data.id;
  } catch (error) {
    console.error('Error in getOrCreateAppFolder:', error);
    throw error;
  }
}

export const createOrUpdateTodoFile = async (todos: any, accessToken: string) => {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  try {
    const folderId = await getOrCreateAppFolder(accessToken);
    
    // Search for main todos file
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${MAIN_FILE_NAME}' and '${folderId}' in parents and trashed=false`,
      { headers }
    );
    const searchData = await searchResponse.json();

    const fileMetadata = {
      name: MAIN_FILE_NAME,
      mimeType: 'application/json',
      parents: [folderId]
    };

    const todoContent = JSON.stringify({
      lastUpdated: new Date().toISOString(),
      todos
    });

    if (searchData.files && searchData.files.length > 0) {
      const fileId = searchData.files[0].id;
      // Update existing file
      const updateResponse = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`,
        {
          method: 'PATCH',
          headers: {
            ...headers,
            'Content-Type': 'multipart/related; boundary=boundary',
          },
          body: `--boundary
Content-Type: application/json; charset=UTF-8

${JSON.stringify(fileMetadata)}

--boundary
Content-Type: application/json

${todoContent}
--boundary--`
        }
      );

      if (!updateResponse.ok) {
        throw new Error('Failed to update todos file');
      }

      return fileId;
    } else {
      // Create new file
      const createResponse = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'multipart/related; boundary=boundary',
          },
          body: `--boundary
Content-Type: application/json; charset=UTF-8

${JSON.stringify(fileMetadata)}

--boundary
Content-Type: application/json

${todoContent}
--boundary--`
        }
      );

      if (!createResponse.ok) {
        throw new Error('Failed to create todos file');
      }

      const data = await createResponse.json();
      return data.id;
    }
  } catch (error) {
    console.error('Error saving todos:', error);
    throw error;
  }
};

export const getTodos = async (accessToken: string) => {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
  };

  try {
    const folderId = await getOrCreateAppFolder(accessToken);
    
    // Get the main todos file
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${MAIN_FILE_NAME}' and '${folderId}' in parents and trashed=false`,
      { headers }
    );
    const searchData = await searchResponse.json();

    if (!searchData.files || searchData.files.length === 0) {
      // Create initial file with empty todos
      await createOrUpdateTodoFile([], accessToken);
      return [];
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${searchData.files[0].id}?alt=media`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch todos file content');
    }
    
    const data = await response.json();
    return data.todos || [];
  } catch (error) {
    console.error('Error loading todos:', error);
    throw error;
  }
};
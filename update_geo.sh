sed -i '/const getCoordinates = (): Promise/,/    });/c\
  const getCoordinates = (): Promise<{ latitude: number; longitude: number } | undefined> => {\
    return new Promise((resolve) => {\
      if (!navigator.geolocation) {\
        return resolve(undefined);\
      }\
      \
      navigator.permissions.query({ name: "geolocation" as any }).then((perm) => {\
        if (perm.state === "granted") {\
          navigator.geolocation.getCurrentPosition(\
            (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),\
            () => resolve(undefined),\
            { timeout: 2000, maximumAge: 60000 }\
          );\
        } else {\
          resolve(undefined);\
        }\
      }).catch(() => resolve(undefined));\
    });\
  };' src/components/EmergencyCenter.tsx

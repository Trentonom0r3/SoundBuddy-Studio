export const example = () => {};

function checkTimelineScrubber() {
    try {
        var currentTime = app.project.activeSequence.getPlayerPosition();

        return currentTime.seconds;
    } catch (e: any) {
        // Handle any errors that may occur
        $.writeln("Error: " + e.toString());
    }
}

export const getPlayerPos = () => {
    try {
        return checkTimelineScrubber();
    } catch (e: any) {
        alert(e);
    }
}

export const setPlayerPos = (time: number) => {
    try {
        var timevar = new Time();
        timevar.seconds = time + (selectedTrack?.start.seconds ?? 0);
        app.project.activeSequence.setPlayerPosition(timevar.ticks);
    } catch (e: any) {
        alert(e.toString());    
    }
}

function DeleteAllMarkers() {
    try {
      var markers = app.project.activeSequence.markers;
      var numMarkers = markers.numMarkers;
  
      // Iterate backward to delete markers safely
      for (var i = numMarkers - 1; i >= 0; i--) {
        markers.deleteMarker(markers[i]);
      }
  
      return "All markers deleted successfully.";
    } catch (e: any) {
      alert(e.toString());
      return ("Error: " + e.toString());
    }
  }
  
let activeSequence = null;
let selectedTrack: TrackItem | null =null;

function getselectedAudioInfo() {
    try {
        var sequence = app.project.activeSequence;
        if (!sequence) {
            alert("No active sequence found.");
            return;
        }
        activeSequence = sequence;
        var audioTracks = sequence.audioTracks;
        for (var i = 0; i < audioTracks.numTracks; i++) {
            var clips = audioTracks[i].clips;
            var selectedClip = [];
            for (var j = 0; j < clips.numItems; j++) {
                var clip = clips[j];
                if (clip.isSelected()) {
                    selectedClip.push(clip);
                }
            }
            if (selectedClip.length > 1) {
                //open a box to select which clip we want
                alert("Multiple clips selected, please select only one clip");
                return;
            }
            if (selectedClip) {
                selectedTrack = selectedClip[0];
                //Construct info on the selected clip
                var info = {
                    name: selectedClip[0].name,
                    inPoint: selectedClip[0].start.seconds,
                    path: selectedClip[0].projectItem.getMediaPath(),
                };
        
            return info;
            }
        }
    }
    catch (e: any) {
        alert(e.toString());
    }
}

export const getAudioInfo = () => {
    try {
        return getselectedAudioInfo();
    } catch (e: any) {
        alert(e);
    }
}

interface Marker {
    start: number;
    id: string;
    content: string;
    color: string;
}

export const applyMarkers = (markers: Marker[]) => {
    try {

        var activeSequence = app.project.activeSequence;
        if (!activeSequence) {
            return "No active sequence.";
        }
        if (selectedTrack) {
            var inpoint = selectedTrack.start.seconds;
        } else {
            alert("No selected track found.");
            var inpoint = 0;
        }
        var markerCollection = activeSequence.markers;
        for (var i = 0; i < markers.length; i++) {
            var marker = markers[i];
            var start = marker.start + inpoint;
            var newMarker = markerCollection.createMarker(start, marker.id, 0, 'Beat Detection Results');
            newMarker.type = 'Segmentation';
            // Convert the color to the appropriate format
            var colorMatch = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d+(\.\d+)?)\)/.exec(marker.color);
            if (colorMatch) {
                var r: number = parseInt(colorMatch[1], 10);
                var g: number = parseInt(colorMatch[2], 10);
                var b: number = parseInt(colorMatch[3], 10);
                var a: number = parseFloat(colorMatch[4]);

                // Convert RGBA to a color index or a valid color value for Premiere Pro
                newMarker.setColorByIndex(2); // Example: set to a specific color index
            }

            newMarker.setColorByIndex(1); // This can be set based on your requirements
        }

        return "Markers applied successfully.";
    } catch (e: any) {
        alert(e.toString());
        return ("Error: " + e.toString());
    }
}

export const deleteMarkers = () => {
    try {
        DeleteAllMarkers();
    } catch (e: any) {
        alert(e);
    }
}

export const addMarkerstoTrack = (markers: Marker[]) => {
 try {
      var markerCollection: MarkerCollection;
      
      if (selectedTrack) {
        markerCollection = selectedTrack.projectItem.getMarkers();
        if (!markerCollection) {
          return "No marker collection found.";
        }
      } else {
        var activeSequence = app.project.activeSequence;
        if (!activeSequence) {
          return "No active sequence.";
        }
        markerCollection = activeSequence.markers;
      }
  
      for (const marker of markers) {
        var start = marker.start + (selectedTrack?.inPoint?.seconds ?? 0);
        var newMarker = markerCollection.createMarker(start, marker.id, 0, 'Beat Detection Results');
        newMarker.type = 'Segmentation';
        // Convert the color to the appropriate format
        var colorMatch = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d+(\.\d+)?)\)/.exec(marker.color);
        if (colorMatch) {
            var r: number = parseInt(colorMatch[1], 10);
            var g: number = parseInt(colorMatch[2], 10);
            var b: number = parseInt(colorMatch[3], 10);
            var a: number = parseFloat(colorMatch[4]);

            // Convert RGBA to a color index or a valid color value for Premiere Pro
            newMarker.setColorByIndex(2); // Example: set to a specific color index
        }

        newMarker.setColorByIndex(1); // This can be set based on your requirements
    }
  
      return "Markers added successfully.";
    } catch (e : any) {
      alert(e.toString());
      return ("Error: " + e.toString());
    }
  }
/*
function DeleteAllMarkers() {
    try {
      var markers = app.project.activeSequence.markers;
      var numMarkers = markers.numMarkers;
  
      // Iterate backward to delete markers safely
      for (var i = numMarkers - 1; i >= 0; i--) {
        markers.deleteMarker(markers[i]);
      }
  
      return "All markers deleted successfully.";
    } catch (e: any) {
      alert(e.toString());
      return ("Error: " + e.toString());
    }
  }*/

  export const deleteAllMarkersFromTrack = () => {
    try {
      if (selectedTrack) {
        var markerCollection = selectedTrack.projectItem.getMarkers();
        if (!markerCollection) {
          return "No marker collection found.";
        }

        // Iterate backward to delete markers safely
        for (var i = markerCollection.numMarkers - 1; i >= 0; i--) {
          markerCollection.deleteMarker(markerCollection[i]);
        }

        return "All markers deleted successfully.";
        }
    }
    catch (e: any) {
      alert(e.toString());
      return ("Error: " + e.toString());
    }
    }


  export const importFile = (filePath: string) => {
    try {
      var project = app.project;

      // If no file path is provided, prompt the user to select a file
      if (!filePath) {
          var fileToImport = File.openDialog("Select a file to import");
          if (!fileToImport) {
              alert("No file selected. Import cancelled.");
              return;
          }
          filePath = (fileToImport as File).fsName;
      }
    
      var importResult = project.importFiles([filePath]);
      if (importResult) {
          alert("File imported successfully!");
      } else {
          alert("Failed to import the file.");
      }
  } catch (e: any) {
      alert(e.toString());
      return ("Error: " + e.toString());
  }
}

export const sendESAlert = (message: string) => {
  alert(message);
}
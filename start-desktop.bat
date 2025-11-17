@echo off
echo Starting LMDI Desktop Application...
echo.
echo This application will open in your default web browser.
echo All calculations are performed locally on your computer.
echo.
echo Make sure you have built the application first by running:
echo npm run build
echo.
echo Opening application...
start dist\index.html
echo.
echo Application started! You can minimize this window.
echo Press any key to close this window...
pause > nul
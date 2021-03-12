@echo off
if "%1" == "/launch" goto launch

start /b localhost.cmd /launch > NUL
python -m http.server

goto end

:launch
REM Delayed launch
timeout /t 1 /nobreak
start http://127.0.0.1:9000/myapp

:end

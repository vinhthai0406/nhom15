## Chạy và truy cập ứng dụng

Deployment `animals-web` chạy 2 Pod. Service kiểu `NodePort` chuyển tiếp yêu cầu từ cổng `30080` của node đến cổng `8000` của ứng dụng trong Pod.

```bash
# Áp dụng Deployment và Service
sudo kubectl apply -f deployment.yaml

# Kiểm tra Pod
sudo kubectl get pods -l app=animals-web -o wide

# Kiểm tra Deployment và Service
sudo kubectl get deployment animals-web
sudo kubectl get svc animals-web

# Xem địa chỉ IP của node
sudo kubectl get nodes -o wide
